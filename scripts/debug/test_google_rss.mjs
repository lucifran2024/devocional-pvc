
import Parser from 'rss-parser';

async function testGoogleRSS() {
    console.log('Testing Google News RSS...');

    // Query: "Christianity devotional" OR specific logic
    const query = 'Christianity devotional';
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:7d&hl=en-US&gl=US&ceid=US:en`;

    console.log(`URL: ${rssUrl}`);

    try {
        const resp = await fetch(rssUrl);
        if (!resp.ok) {
            console.error(`Blocked? ${resp.status}`);
            return;
        }

        const xmlText = await resp.text();
        const parser = new Parser();
        const feed = await parser.parseString(xmlText);

        console.log(`Items found: ${feed.items.length}`);
        if (feed.items.length > 0) {
            console.log('First Item:', feed.items[0].title);
            console.log('Link:', feed.items[0].link);
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

testGoogleRSS();
