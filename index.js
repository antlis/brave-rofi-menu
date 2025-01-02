const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

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

  // Create a list of tab titles for rofi
  let tabList = pages.map((page, index) => {
    return { index, title: page.title() };
  });

  // Wait for all titles to be available
  const tabTitles = await Promise.all(
    tabList.map(async (tab) => {
      tab.title = await tab.title;
      return `${tab.index + 1}. ${tab.title}`;
    })
  );

  // Show the list of tabs in rofi for selection
  const selected = execSync(
    `echo -e "${tabTitles.join("\n")}" | rofi -dmenu -i -p "Select Tab"`
  )
    .toString()
    .trim();

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

  // Close the browser connection
  await browser.disconnect();
})();
