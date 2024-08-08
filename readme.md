# puppeteer-scrape

A headless web scraping service built with Node.js and Puppeteer. It provides an API endpoint to scrape a given URL and analyze the network communication, response headers, and performance metrics of the page as well as the base64 content of the page.

## Installation
Building the project from scratch can take a long time, take it as an opportunity to get a coffee
1. Clone the repository.
2. Run `docker build -t puppeteer-scrape . ` to build the docker file.

## Usage

Start the server by running `docker run -it --rm -p 3000:3000 puppeteer-scrape`. The server will start on port 3000.

The service provides a POST endpoint at `/scrape` that accepts a JSON body with a `url` field. The `url` should be the page you want to scrape.

Example request:

```sh
curl -X POST http://localhost:3000/detailed_scrape -H 'Content-Type: application/json' -d '{"url": "https://www.example.com"}'
curl -X POST http://localhost:3000/simple_scrape -H 'Content-Type: application/json' -d '{"url": "https://www.example.com"}'

```

The response will be a JSON object containing the following fields:

- `networkMap`: An array of objects, each representing a network request made by the page. Each object includes the hostname, URL, HTTP method, status code, and MIME type of the request.
- `headersInfo`: An array of objects, each representing the response headers for a network request. Each object includes the URL of the request and an object mapping header names to their values.
- `performanceMetrics`: An object summarizing the performance of the page. This includes the total load time, time to first byte, and the sizes of different types of resources (images, scripts, stylesheets, and other).

## Error Handling

If the `url` field is not provided in the request, the server will respond with a 400 status code and a message "URL is required".

If an error occurs during scraping, the server will respond with a 500 status code and a message "An error occurred during scraping".

## License

This project is licensed under the AGPL License.