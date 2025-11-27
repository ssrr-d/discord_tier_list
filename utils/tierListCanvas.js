const { createCanvas, loadImage } = require('@napi-rs/canvas');

const DEFAULT_COLORS = [
    '#ff7f7f', // Red
    '#ffbf7f', // Orange
    '#ffdf7f', // Yellow
    '#ffff7f', // Light Yellow
    '#bfff7f', // Green
    '#7fffbf', // Teal
    '#7fffff', // Cyan
    '#7fbfff', // Blue
    '#7f7fff', // Indigo
    '#bf7fff'  // Purple
];

const ROW_HEIGHT = 100;
const LABEL_WIDTH = 150; // Increased width for longer names
const CANVAS_WIDTH = 800;
const AVATAR_SIZE = 80;
const PADDING = 10;

async function drawTierList(tierData, tierLabels) {
    // Calculate total height
    const canvasHeight = tierLabels.length * ROW_HEIGHT;
    const canvas = createCanvas(CANVAS_WIDTH, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#1e1e1e'; // Dark background
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    for (let i = 0; i < tierLabels.length; i++) {
        const tier = tierLabels[i];
        const y = i * ROW_HEIGHT;

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

                // Check if we exceed canvas width
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
