const crypto = require('crypto');
const express = require('express');
const puppeteer = require('puppeteer');
const PuppeteerHar = require('puppeteer-har');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const launchBrowser = async () => {
  return await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
};

const scrapePageContent = async (url) => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });
  const renderedContent = await page.evaluate(() => document.body.innerText.replace(/\n/g, ' '));
  await browser.close();
  return renderedContent;
};

const scrapeDetailedContent = async (url) => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const har = new PuppeteerHar(page);
  await har.start();
  await page.goto(url, { waitUntil: 'networkidle0' });

  const renderedContent = await page.evaluate(() => document.body.innerText);
  const content = await page.content();
  const harData = await har.stop();
  await browser.close();

  const encodedContent = Buffer.from(content).toString('base64');
  const networkMap = analyzeNetworkRelationships(harData);
  const headersInfo = analyzeResponseHeaders(harData);
  const performanceMetrics = summarizePerformance(harData);

  return {
    networkMap,
    headersInfo,
    performanceMetrics,
    renderedContent,
    content: encodedContent,
  };
};

const analyzeNetworkRelationships = (harData) => {
  const networkMap = [];
  if (harData.log && Array.isArray(harData.log.entries)) {
    harData.log.entries.forEach(entry => {
      const url = new URL(entry.request.url);
      const domain = url.hostname;
      networkMap.push({
        hostname: domain,
        url: entry.request.url,
        method: entry.request.method,
        status: entry.response.status,
        mimeType: entry.response.content.mimeType,
      });
    });
  }
  return networkMap;
};

const analyzeResponseHeaders = (harData) => {
  const headersInfo = [];
  if (harData.log && Array.isArray(harData.log.entries)) {
    harData.log.entries.forEach(entry => {
      const url = entry.request.url;
      const responseHeaders = {};
      entry.response.headers.forEach(header => {
        responseHeaders[header.name] = header.value;
      });
      headersInfo.push({ url, headers: responseHeaders });
    });
  }
  return headersInfo;
};

const summarizePerformance = (harData) => {
  const performanceMetrics = {
    totalLoadTime: 0,
    timeToFirstByte: null,
    resourceSizes: {
      images: 0,
      scripts: 0,
      stylesheets: 0,
      other: 0,
    },
  };

  if (harData.log && Array.isArray(harData.log.entries)) {
    let firstRequestTime = null;
    harData.log.entries.forEach(entry => {
      const startTime = new Date(entry.startedDateTime).getTime();
      const endTime = startTime + entry.time;
      if (endTime > performanceMetrics.totalLoadTime) {
        performanceMetrics.totalLoadTime = endTime;
      }
      if (firstRequestTime === null || startTime < firstRequestTime) {
        firstRequestTime = startTime;
        performanceMetrics.timeToFirstByte = entry.timings.wait;
      }
      const mimeType = entry.response.content.mimeType;
      const size = entry.response.bodySize;
      if (mimeType.includes('image')) {
        performanceMetrics.resourceSizes.images += size;
      } else if (mimeType.includes('javascript')) {
        performanceMetrics.resourceSizes.scripts += size;
      } else if (mimeType.includes('css')) {
        performanceMetrics.resourceSizes.stylesheets += size;
      } else {
        performanceMetrics.resourceSizes.other += size;
      }
    });
    if (firstRequestTime !== null) {
      performanceMetrics.totalLoadTime -= firstRequestTime;
    }
  }
  return performanceMetrics;
};

app.post('/detailed_scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).send('URL is required');
  }
  try {
    const responseData = await scrapeDetailedContent(url);
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('An error occurred during scraping');
  }
});

app.post('/simple_scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).send('URL is required');
  }
  try {
    const renderedContent = await scrapePageContent(url);
    res.status(200).json({ renderedContent });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('An error occurred during scraping');
  }
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

process.on('SIGINT', () => {
  console.log('Gracefully shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
