import fs from "fs";
import axios from "axios";
import * as cheerio from 'cheerio';

const crawlText = async (url) => {
  try {
    const response = await axios.get(url);

    if (response?.status == 200) {
      const $ = cheerio.load(response?.data);
      const data = [];

      $(".job__list-item").each((index, el) => {
        const job = $(el).find(".job__list-item-title a").text();
        const company = $(el).find(".job__list-item-company span").text();
        const address = $(el)
          .find(".job__list-item-info")
          .find(".address")
          .text();
        const salary = $(el)
          .find(".job__list-item-info")
          .find(".salary")
          .text();
        const teaser = $(el).find(".job__list-item-teaser").text();

        data.push({
          job,
          company,
          address,
          salary,
          teaser,
        });

        fs.writeFileSync("./result/data.json", JSON.stringify({ data }));
      });
    }
  } catch (error) {
    console.log('error');
  }
};
crawlText("https://123job.vn/tuyen-dung");
