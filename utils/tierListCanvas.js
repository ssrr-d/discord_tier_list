const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// Register a default font if needed, though usually system fonts work or we can skip for now
// GlobalFonts.registerFromPath(path.join(__dirname, '..', 'fonts', 'Roboto-Regular.ttf'), 'Roboto');

const TIER_COLORS = {
    S: '#ff7f7f',
    A: '#ffbf7f',
    B: '#ffdf7f',
    C: '#ffff7f',
    D: '#bfff7f'
};

const TIER_LABELS = ['S', 'A', 'B', 'C', 'D'];
const ROW_HEIGHT = 100;
const LABEL_WIDTH = 100;
const CANVAS_WIDTH = 800;
const AVATAR_SIZE = 80;
const PADDING = 10;

async function drawTierList(tierData) {
    // Calculate total height based on number of tiers (fixed to 5 for now)
    const canvasHeight = TIER_LABELS.length * ROW_HEIGHT;
    const canvas = createCanvas(CANVAS_WIDTH, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#1e1e1e'; // Dark background
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    for (let i = 0; i < TIER_LABELS.length; i++) {
        const tier = TIER_LABELS[i];
        const y = i * ROW_HEIGHT;

        // Draw Tier Label Background
        ctx.fillStyle = TIER_COLORS[tier];
        ctx.fillRect(0, y, LABEL_WIDTH, ROW_HEIGHT);

        // Draw Tier Label Text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tier, LABEL_WIDTH / 2, y + ROW_HEIGHT / 2);

        // Draw Separator Line
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y + ROW_HEIGHT);
        ctx.lineTo(CANVAS_WIDTH, y + ROW_HEIGHT);
        ctx.stroke();

        // Draw Avatars in this tier
        const members = tierData[tier] || [];
        for (let j = 0; j < members.length; j++) {
            const member = members[j];
            if (!member.avatarUrl) continue;

            try {
                const avatar = await loadImage(member.avatarUrl);
                const x = LABEL_WIDTH + PADDING + j * (AVATAR_SIZE + PADDING);

                // Check if we exceed canvas width, for now just clip/don't draw
                if (x + AVATAR_SIZE > CANVAS_WIDTH) break;

                // Draw avatar
                ctx.save();
                ctx.beginPath();
                // Circular avatar
                ctx.arc(x + AVATAR_SIZE / 2, y + (ROW_HEIGHT - AVATAR_SIZE) / 2 + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, x, y + (ROW_HEIGHT - AVATAR_SIZE) / 2, AVATAR_SIZE, AVATAR_SIZE);
                ctx.restore();

            } catch (err) {
                console.error(`Failed to load avatar for ${member.username}:`, err);
            }
        }
    }

    return canvas.toBuffer('image/png');
}

module.exports = { drawTierList };
