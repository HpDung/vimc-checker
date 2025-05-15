import express from "express";
import puppeteer from "puppeteer";
import nodemailer from "nodemailer";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
const LOG_FILE = "sent_links.log";
const EMAIL_TO = "svcmarineservices@gmail.com";

async function getInternalLinks() {
  const browser = await puppeteer.launch({
    headless: "new", // tránh warning
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.goto("https://vimc-shipping.com", { waitUntil: "networkidle2" });

  const links = await page.$$eval("a", (as) =>
    as.map((a) => a.href).filter((l) => l.startsWith("https://vimc-shipping.com"))
  );

  await browser.close();
  return [...new Set(links)];
}

async function sendEmail(subject, body) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "jroa8487@gmail.com",
      pass: "emii aevh ffun hirk",
    },
  });

  await transporter.sendMail({
    from: '"VIMC Bot" <jroa8487@gmail.com>',
    to: EMAIL_TO,
    subject,
    text: body,
  });
}

app.get("/", async (req, res) => {
  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  res.send(`🕓 Script bắt đầu lúc ${now}. Kết quả sẽ được gửi qua email nếu có link mới.`);

  try {
    const allLinks = await getInternalLinks();
    const loggedLinks = fs.existsSync(LOG_FILE)
      ? fs.readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean)
      : [];

    const newLinks = allLinks.filter((link) => !loggedLinks.includes(link));

    if (newLinks.length > 0) {
      const body = `🕓 ${now}\n🔗 Link mới:\n` + newLinks.map((l) => `• ${l}`).join("\n");
      await sendEmail(`[VIMC] Link mới từ trang chủ`, body);
      fs.appendFileSync(LOG_FILE, newLinks.join("\n") + "\n");
    } else {
      await sendEmail(`[VIMC] Không có link mới`, `🕓 ${now}\n✅ Không có link mới hôm nay`);
    }
  } catch (err) {
    console.error("Lỗi khi chạy puppeteer:", err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại cổng ${PORT}`);
});
