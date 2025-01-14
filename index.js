import CDP from 'chrome-remote-interface';
import { execSync } from 'child_process';

async function findAndFocusBraveWindow(tabTitle) {
try {
console.log('Searching for Brave windows...');
    // Get a list of all i3 windows
    const i3Windows = JSON.parse(execSync('i3-msg -t get_tree').toString());

    // Recursively find Brave windows
    const findBraveWindows = (node, braveWindows = []) => {
      if (node.nodes) {
        for (const child of node.nodes) {
        findBraveWindows(child, braveWindows);
        }
      }
      if (node.window && node.name && node.name.includes('Brave')) {
        braveWindows.push({ id: node.window, name: node.name });
      }
      return braveWindows;
    };

    const braveWindows = findBraveWindows(i3Windows);

    if (braveWindows.length > 0) {
      // Find the Brave window matching the tab title
      const targetWindow = braveWindows.find((win) => win.name.includes(tabTitle));

      if (targetWindow) {
        execSync(`i3-msg [id="${targetWindow.id}"] focus`);
        console.log(`Focused on Brave window: ${targetWindow.name}`);
    } else {
        console.warn(`Tab title "${tabTitle}" not found. Focusing the first Brave window.`);
        execSync(`i3-msg [id="${braveWindows[0].id}"] focus`);
      }
    } else {
      throw new Error('No Brave windows found in i3.');
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
        console.error('JSON parse error while fetching i3 windows:', err.message);
    } else {
        console.error('Unexpected error focusing Brave window:', err.message);
    }
  }
}

(async () => {
  try {
    console.log('Connecting to Brave...');
    const client = await CDP({
      host: 'localhost',
      port: 9222,
    });

    console.log('Connected to Brave.');

    // Get the list of all targets
    const targets = await CDP.List({
      host: 'localhost',
      port: 9222,
    });

    // Filter for page type targets
    const pages = targets.filter((target) => target.type === 'page');

    if (pages.length === 0) {
      throw new Error('No pages found. Ensure Brave is running with open tabs.');
    }

    console.log(`Found ${pages.length} page(s):`);
    pages.forEach((page, index) => {
    console.log(`  ${index + 1}. ${page.title || 'Untitled'} - ${page.url}`);
    });

    // Display options in rofi with separators
    const pageOptions = pages
      .map((page, index) => `${index + 1}. ${page.title || 'Untitled'} - ${page.url}`)
      .join('\n');

    const selected = execSync(
      `echo -e "Search (Brave)\n────\n${pageOptions}\n────\n- Bookmarks\n- New Tab\n- Close Tab\n- Search in incognito\n- Exit" | rofi -dmenu -i -p "Select Tab" -theme-str 'window { fullscreen: true; } mainbox { padding: 2%; }'`
    )
      .toString()
      .trim();

    if (selected === 'Search (Brave)') {
      const searchQuery = execSync(
        `rofi -dmenu -p "Enter search query:" -theme-str 'window { fullscreen: true; } mainbox { padding: 2%; }'`
      )
        .toString()
        .trim();

      if (searchQuery) {
        console.log(`Searching for: ${searchQuery}`);
        const { Target } = client;
        const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(searchQuery)}`;
        const newTarget = await Target.createTarget({ url: searchUrl });
        console.log('Opened search result in new tab:', newTarget);

        // Focus on the Brave browser window
        await findAndFocusBraveWindow(searchQuery);
      } else {
        console.log('Search query is empty. No action taken.');
      }
    } else if (selected === '- Bookmarks') {
      console.log('Launching bookmarks script...');
      execSync('~/bin/rofi/rofi-bookmarks-brave');
      console.log('Bookmarks script launched.');
    } else if (selected === '- New Tab') {
      console.log('Opening new tab...');
      const { Target } = client;
      const newTarget = await Target.createTarget({ url: 'brave://newtab' });
      console.log('New tab opened:', newTarget);
    } else if (selected === '- Close Tab') {
      const tabsToClose = execSync(
        `echo -e "${pageOptions}" | rofi -dmenu -i -p "Select Tabs to Close" -multi-select -theme-str 'window { fullscreen: true; } mainbox { padding: 2%; }'`
      )
        .toString()
        .trim()
        .split('\n');

      if (tabsToClose.length > 0) {
        const { Target } = client;
        for (const tab of tabsToClose) {
          const selectedIndex = parseInt(tab.split('.')[0]) - 1;
          if (!isNaN(selectedIndex)) {
            const selectedPage = pages[selectedIndex];
            await Target.closeTarget({ targetId: selectedPage.id });
            console.log(`Closed tab: ${selectedPage.title}`);
          }
        }
      } else {
        console.log('No tabs selected to close.');
      }
    } else if (selected === '- Search in incognito') {
      console.log('Launching incognito search script...');
      execSync('~/bin/rofi/rofi-brave-debug-incognito');
      console.log('Incognito search script launched.');
    } else if (selected === '- Exit' || !selected) {
      console.log('Exiting...');
    } else {
      const selectedIndex = parseInt(selected.split('.')[0]) - 1;
      if (!isNaN(selectedIndex)) {
        console.log(`Switching to tab ${selectedIndex + 1}...`);
        const selectedPage = pages[selectedIndex];
        const { Target } = client;
        await Target.activateTarget({ targetId: selectedPage.id });
        console.log(`Switched to: ${selectedPage.title}`);
        await findAndFocusBraveWindow(selectedPage.title);
      }
    }

    await client.close();
    console.log('Disconnected from Brave.');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
