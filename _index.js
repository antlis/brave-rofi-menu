// TODO: Consider removing
// Deprecated
// Puppetter hangs randomgly
import puppeteer from 'puppeteer';

(async () => {
  try {
    console.log('Connecting to Brave...');
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null,
      timeout: 30000,
    });

    console.log('Connected to Brave.');

    // Get all targets
    const targets = await browser.targets();

    // Filter for page type targets
    const pages = targets
      .filter((t) => t.type() === 'page')
      .map((t) => ({
        title: t._targetInfo.title || 'Unknown Title',
        url: t._targetInfo.url,
        webSocketDebuggerUrl: t._targetInfo.webSocketDebuggerUrl,
      }));

    if (pages.length === 0) {
      throw new Error('No pages found. Ensure Brave is running with open tabs.');
    }

    console.log(`Found ${pages.length} page(s):`);
    pages.forEach((page, index) => {
      console.log(`${index + 1}. ${page.title} - ${page.url}`);
    });

    // Display options in rofi
    const pageOptions = pages
      .map((page, index) => `${index + 1}. ${page.title} - ${page.url}`)
      .join('\n');

    const selected = require('child_process')
      .execSync(`echo -e "${pageOptions}\n- New Tab\n- Exit" | rofi -dmenu -i -p "Select Tab"`)
      .toString()
      .trim();

    if (selected === '- New Tab') {
      console.log('Opening new tab...');
      const newPage = await browser.newPage();
      await newPage.goto('brave://newtab');
    } else if (selected === '- Exit' || !selected) {
      console.log('Exiting...');
    } else {
      const selectedIndex = parseInt(selected.split('.')[0]) - 1;
      if (!isNaN(selectedIndex)) {
        console.log(`Switching to tab ${selectedIndex + 1}...`);
        const selectedPage = await browser.newPage();
        await selectedPage.goto(pages[selectedIndex].url);
      }
    }

    await browser.disconnect();
    console.log('Disconnected from Brave.');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
