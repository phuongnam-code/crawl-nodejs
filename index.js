import fs from "fs";
import path from "path";
import * as cheerio from 'cheerio';
import axios from "axios";
import puppeteer from "puppeteer";

// download with img src
const crawlImages = async (url) => {
  try {
    const response = await axios.get(url, { params: { k: 'desktop+wallpaper+hd'}});

    if (response?.status == 200) {
      const $ = cheerio.load(response?.data);
      const imageUrls = [];

      $(".thumb-frame").each((index, el) => {
        const imageUrl = $(el).find('img').attr("src");
        if (
          imageUrl &&
          !imageUrl.startsWith("data:") &&
          !imageUrls.includes(imageUrl)
        ) {
          imageUrls.push(imageUrl);
        }
      });

      imageUrls.forEach(async (imageUrl, index) => {
        const imageName = path.basename(imageUrl);
        const imagePath = path.join("./result", imageName);
        const imageResponse = await axios.get(imageUrl, {
          responseType: "stream",
        });
        imageResponse.data.pipe(fs.createWriteStream(imagePath));
      });

      fs.writeFileSync("./result/images.json", JSON.stringify({ imageUrls }));
    }
  } catch (error) {
    console.log('error', error);
  }
};
crawlImages("https://stock.adobe.com/vn/search");

// lazy-load or infinity scroll
const crawlImagesLazy = async (url, maxScrolls) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    let imageUrls = [];

    for (let i = 0; i < maxScrolls; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      let newImageUrls = await page.evaluate(() => {
        const images = document.querySelectorAll("img[data-src]");
        return Array.from(images).map((img) => img.getAttribute("data-src"));
      });

      newImageUrls = newImageUrls.filter((url) => !imageUrls.includes(url));

      imageUrls = [...imageUrls, ...newImageUrls];
    }

    await browser.close();

    imageUrls.forEach(async (imageUrl, index) => {
      const imageName = path.basename(imageUrl);
      const imagePath = path.join("./result", imageName);
      const imageResponse = await axios.get(imageUrl, {
        responseType: "stream",
      });
      imageResponse.data.pipe(fs.createWriteStream(imagePath));
    });

    fs.writeFileSync("./result/images.json", JSON.stringify({ imageUrls }));
  } catch (error) {
    console.log('error');
  }
};
// crawlImagesLazy("https://www.example.com/", 2);

const crawlImagesPagination = async (url, maxPages) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let imageUrls = [];

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      const currentPageUrl =
        pageNumber === 1 ? url : `${url}?page=${pageNumber}`;

      await page.goto(currentPageUrl);
      const htmlContent = await page.content();

      const regex = /<img[^>]+srcset="([^"]+)"/g;
      let match;
      while ((match = regex.exec(htmlContent))) {
        const srcset = match[1];
        const images = srcset.split(",").map((item) => {
          const [imageUrl, imageSize] = item.trim().split(" ");
          return { url: imageUrl, size: parseInt(imageSize) || 0 };
        });
        const largestImage = images.reduce(
          (prev, curr) => (curr.size > prev.size ? curr : prev),
          { size: 0 }
        );
        if (!largestImage?.url.startsWith("data:") && !imageUrls.includes(largestImage?.url)) {
          imageUrls.push(largestImage?.url);
        }
      }
    }

    await browser.close();

    imageUrls.forEach(async (imageUrl, index) => {
      const imageName = `image${index + 1}.jpg`;
      const imagePath = path.join("./result", imageName);
      const imageResponse = await axios.get(imageUrl, {
        responseType: "stream",
      });
      imageResponse.data.pipe(fs.createWriteStream(imagePath));
    });

    fs.writeFileSync("./result/images.json", JSON.stringify({ imageUrls }));
  } catch (error) {
    console.log('error');
  }
};
// crawlImagesPagination("https://unsplash.com/backgrounds/desktop", 2);
