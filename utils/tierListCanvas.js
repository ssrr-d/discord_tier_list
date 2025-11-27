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
