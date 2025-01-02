import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os'; // For home directory resolution

(async () => {
  // Connect to the running instance of Brave via remote debugging
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });

  console.log('browser: ', browser);

  // Get all the pages (tabs) currently open in Brave
  const pages = await browser.pages();

  console.log('pages: ', pages);

  // Create a list of tab titles and URLs for rofi
  let tabList = pages.map((page, index) => {
    return { index, title: page.title(), url: page.url() };
  });

  // Add options for "New Tab", "Bookmarks"
  tabList.push({ index: -2, title: "New Tab" });
  tabList.push({ index: -3, title: "Bookmarks" });

  // Add "Close Tab" as the last item in the list
  tabList.push({ index: -1, title: "Close Tab" });

  // Wait for all titles and URLs to be available
  const tabTitles = await Promise.all(
    tabList.map(async (tab) => {
      if (tab.index === -1) {
        return `- Close Tab`;
      } else if (tab.index === -2) {
        return `- New Tab`;
      } else if (tab.index === -3) {
        return `- Bookmarks`;
      }
      tab.title = await tab.title;
      return `${tab.index + 1}. ${tab.title} - ${tab.url}`;
    })
  );

  // Show the list of tabs in rofi for selection
  const selected = execSync(
    `echo -e "${tabTitles.join("\n")}" | rofi -dmenu -i -p "Select Tab"`
  )
    .toString()
    .trim();

  if (selected === "- Close Tab") {
    // User selected "Close Tab", handle it below
    const selectedToClose = execSync(
      `echo -e "${tabTitles.slice(0, tabTitles.length - 1).join("\n")}" | rofi -dmenu -i -p "Select Tab to Close"`
    )
      .toString()
      .trim();

    // Find the selected tab index to close
    const selectedIndexToClose = parseInt(selectedToClose.split('.')[0]) - 1;

    if (!isNaN(selectedIndexToClose)) {
      // Close the selected tab
      const selectedPage = pages[selectedIndexToClose];
      await selectedPage.close();
      console.log(`Closed tab: ${selectedToClose}`);
    }
  } else if (selected === "- New Tab") {
    // User selected "New Tab", open a new tab
    const newPage = await browser.newPage();
    await newPage.goto('brave://newtab'); // Open a new blank tab, or use a URL
    console.log('Opened new tab');
  } else if (selected === "- Bookmarks") {
    // User selected "Bookmarks", execute the shell script
    const scriptPath = path.resolve(os.homedir(), 'bin/rofi/rofi-bookmarks-brave'); // Resolve home directory
    console.log('Executing script at:', scriptPath); // Log for debugging
    try {
      execSync(scriptPath, { stdio: 'inherit' });
      console.log('Bookmarks launched successfully');
    } catch (error) {
      console.error('Failed to execute bookmarks script:', error.message);
    }
  } else {
    // Find the selected tab index
    const selectedIndex = parseInt(selected.split('.')[0]) - 1;

    if (!isNaN(selectedIndex)) {
      // Bring the selected tab to the front
      const selectedPage = pages[selectedIndex];
      await selectedPage.bringToFront();

      // Focus on the correct Brave window in i3
      try {
        // Get a list of all i3 windows
        const i3Windows = JSON.parse(execSync('i3-msg -t get_tree').toString());

        // Function to recursively find Brave windows
        const findBraveWindows = (node, braveWindows = []) => {
          if (node.nodes) {
            node.nodes.forEach((child) => findBraveWindows(child, braveWindows));
          }
          if (node.window && node.name && node.name.includes('Brave')) {
            braveWindows.push({ id: node.window, name: node.name });
          }
          return braveWindows;
        };

        const braveWindows = findBraveWindows(i3Windows);

        if (braveWindows.length > 0) {
          // Get the title of the selected tab
          const selectedTabTitle = await selectedPage.title();

          // Find the Brave window matching the selected tab title
          const targetWindow = braveWindows.find((win) =>
            win.name.includes(selectedTabTitle)
          );

          if (targetWindow) {
            execSync(`i3-msg [id="${targetWindow.id}"] focus`);
          } else {
            console.warn(
              'No specific window matched the tab title. Focusing the first Brave window.'
            );
            execSync(`i3-msg [id="${braveWindows[0].id}"] focus`);
          }
        } else {
          throw new Error('No Brave windows found in i3.');
        }
      } catch (error) {
        console.error('Failed to focus on the Brave window in i3:', error.message);
      }
    }
  }

  // Close the browser connection
  await browser.disconnect();
})();
