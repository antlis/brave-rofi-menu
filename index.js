import CDP from 'chrome-remote-interface';
import { execSync } from 'child_process';

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
      `echo -e "${pageOptions}\n- New Tab\n- Exit" | rofi -dmenu -i -p "Select Tab"`
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
      }
    }

    console.log('Disconnected from Brave.');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
