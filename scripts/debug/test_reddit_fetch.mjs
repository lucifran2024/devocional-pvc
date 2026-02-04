// Native fetch is available in Node 18+

async function testReddit() {
    console.log('Testing Reddit Fetch...');
    const subreddits = 'Christianity+Bible+TrueChristian';
    const q = 'devotional OR verse OR scripture OR reflection';
    const sort = 'top';
    const timeFilter = 'week';
    const url = `https://www.reddit.com/r/${subreddits}/search.json?q=${encodeURIComponent(q)}&restrict_sr=1&sort=${sort}&t=${timeFilter}&limit=15`;

    console.log(`URL: ${url}`);

    try {
        const resp = await fetch(url, {
            headers: { 'User-Agent': 'DevocionalPVC/1.0' }
        });

        if (!resp.ok) {
            console.error(`Error: ${resp.status} - ${resp.statusText}`);
            return;
        }

        const data = await resp.json();
        const posts = data.data.children;
        console.log(`Found ${posts.length} posts.`);

        if (posts.length > 0) {
            console.log('First Title:', posts[0].data.title);
            console.log('First Score:', posts[0].data.score);
        }

        // Test filtering
        const twoDaysAgo = Math.floor(Date.now() / 1000) - (48 * 60 * 60);
        const filtered = posts.map(p => p.data).filter(p => p.created_utc > twoDaysAgo);
        console.log(`Posts form last 48h: ${filtered.length}`);

    } catch (e) {
        console.error('Exception:', e);
    }
}

testReddit();
