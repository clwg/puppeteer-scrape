const crypto = require('crypto');
const express = require('express');
const puppeteer = require('puppeteer');
const PuppeteerHar = require('puppeteer-har');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/detailed_scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).send('URL is required');
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    const har = new PuppeteerHar(page);
    await har.start();
    await page.goto(url, {
      waitUntil: 'networkidle0',
    });

    const renderedContent = await page.evaluate(() => document.body.innerText);
    const content = await page.content();
    const harData = await har.stop();
    await browser.close();

    const encodedContent = Buffer.from(content).toString('base64');

    const networkMap = analyzeNetworkRelationships(harData);
    const headersInfo = analyzeResponseHeaders(harData);
    const performanceMetrics = summarizePerformance(harData);

    

    const responseData = {
      networkMap,
      headersInfo,
      performanceMetrics,
      renderedContent: renderedContent,
      content: encodedContent
    };

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
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: 'networkidle0',
    });
    const renderedContent = await page.evaluate(() => document.body.innerText.replace(/\n/g, ' '));
    await browser.close();

    res.status(200).json({ renderedContent });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('An error occurred during scraping');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

function analyzeNetworkRelationships(harData) {
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
}

function analyzeResponseHeaders(harData) {
    const headersInfo = [];

    if (harData.log && Array.isArray(harData.log.entries)) {
        harData.log.entries.forEach(entry => {
            const url = entry.request.url;
            const responseHeaders = {};

            entry.response.headers.forEach(header => {
                responseHeaders[header.name] = header.value;
            });

            headersInfo.push({
                url: url,
                headers: responseHeaders
            });
        });
    }

    return headersInfo;
}


function summarizePerformance(harData) {
    const performanceMetrics = {
      totalLoadTime: 0,
      timeToFirstByte: null,
      resourceSizes: {
        images: 0,
        scripts: 0,
        stylesheets: 0,
        other: 0
      }
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
}


