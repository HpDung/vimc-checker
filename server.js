import express from "express";
import puppeteer from "puppeteer-core";
import nodemailer from "nodemailer";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
const LOG_FILE = "sent_links.log";
const EMAIL_TO = "svcmarineservices@gmail.com";

async function getInternalLinks() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
    executablePath: '/usr/bin/google-chrome' // Chrome hệ thống trên Render
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
  try {
    const allLinks = await getInternalLinks();
    const loggedLinks = fs.existsSync(LOG_FILE)
      ? fs.readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean)
      : [];

    const newLinks = allLinks.filter((link) => !loggedLinks.includes(link));
    const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    let message;

    if (newLinks.length > 0) {
      const body = `🕓 ${now}\n🔗 Link mới:\n` + newLinks.map((l) => `• ${l}`).join("\n");
      await sendEmail(`[VIMC] Link mới từ trang chủ`, body);
      fs.appendFileSync(LOG_FILE, newLinks.join("\n") + "\n");
      message = `Đã gửi ${newLinks.length} link mới`;
    } else {
      const body = `🕓 ${now}\n✅ Không có link mới.`;
      await sendEmail(`[VIMC] Không có link mới`, body);
      message = "Không có link mới nào.";
    }

    res.send(message);
  } catch (err) {
    console.error("Lỗi khi chạy script:", err);
    res.status(500).send("Lỗi: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại cổng ${PORT}`);
});
