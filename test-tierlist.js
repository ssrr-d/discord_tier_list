const { drawTierList } = require('./utils/tierListCanvas');
const fs = require('fs');

async function test() {
    const tierData = {
        'S': [],
        'A': [],
        'B': [],
        'C': [],
        'D': []
    };
    const tierLabels = ['S', 'A', 'B', 'C', 'D'];

    console.log('Generating tier list...');
    const buffer = await drawTierList(tierData, tierLabels);
    fs.writeFileSync('test-tierlist.png', buffer);
    console.log('Test tier list saved to test-tierlist.png');
}

test().catch(console.error);
