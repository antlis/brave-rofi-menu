import CDP from 'chrome-remote-interface';
import { execSync } from 'child_process';

async function findAndFocusBraveWindow(tabTitle) {
  try {
    // Get a list of all i3 windows
    const i3Windows = JSON.parse(execSync('i3-msg -t get_tree').toString());

    // Recursively find Brave windows
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
      // Find the Brave window matching the tab title
      const targetWindow = braveWindows.find((win) => win.name.includes(tabTitle));

      if (targetWindow) {
        execSync(`i3-msg [id="${targetWindow.id}"] focus`);
        console.log(`Focused on Brave window: ${targetWindow.name}`);
      } else {
        console.warn(
          'No specific window matched the tab title. Focusing the first Brave window.'
        );
        execSync(`i3-msg [id="${braveWindows[0].id}"] focus`);
      }
    } else {
      throw new Error('No Brave windows found in i3.');
    }
  } catch (err) {
    console.error('Error focusing Brave window:', err.message);
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
      console.log(`${index + 1}. ${page.title || 'Untitled'} - ${page.url}`);
    });

    // Display options in rofi
    const pageOptions = pages
      .map((page, index) => `${index + 1}. ${page.title || 'Untitled'} - ${page.url}`)
      .join('\n');

    const selected = execSync(
      `echo -e "${pageOptions}\n- New Tab\n- Exit" | rofi -dmenu -i -p "Select Tab" -theme-str 'window { fullscreen: true; } mainbox { padding: 2%; }'`
    )
      .toString()
      .trim();

    if (selected === '- New Tab') {
      console.log('Opening new tab...');
      const { Target } = client;
      const newTarget = await Target.createTarget({ url: 'brave://newtab' });
      console.log('New tab opened:', newTarget);
    } else if (selected === '- Exit' || !selected) {
      console.log('Exiting...');
    } else {
      const selectedIndex = parseInt(selected.split('.')[0]) - 1;
      if (!isNaN(selectedIndex)) {
        console.log(`Switching to tab ${selectedIndex + 1}...`);
        const selectedPage = pages[selectedIndex];
        const { Target } = client;

        // Activate the selected page
        await Target.activateTarget({ targetId: selectedPage.id });
        console.log(`Switched to: ${selectedPage.title}`);

        // Focus on the Brave browser window using the tab title
        await findAndFocusBraveWindow(selectedPage.title);
      }
    }

    console.log('Disconnected from Brave.');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
