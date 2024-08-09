let pause = true;
const player = document.getElementById('player');
const crosshair = document.querySelector('.crosshair');
let playerX = window.innerWidth / 2;
let playerY = window.innerHeight / 2;
let playerStats;
let speed = 5;
const keys = {};
let maxPlayerHealth = 100;
let playerHealth = maxPlayerHealth;
let projectiles = [];
let zombies = [];
let droppedItems = [];
let projectileSpeed = 10;
const zombieSpeed = 3;
let isMouseDown = false;
let lastShootTime = 0;
let lastZombieSpawnTime = 0;
const shootInterval = 200;
const zombieSpawnInterval = 1500;
const zombieDamage = 10;
const playerHitCooldown = 1000;
let playerDamage = 25;
const zombieTargetBonusDamage = 10;
let isTargetingZombie = false;
let lastPlayerHitTime = 0;
let maxAmmo = 30;
let ammo = maxAmmo;
let xp = 0;
let score = 0;
let xpStores = [];
let lastXpStoreSpawnTime = 0;
const xpStoreSpawnInterval = 30000;
const dropChance = .9;
const lowAmmoThreshold = 10;
const normalAmmoPouchChance = .5;
const increasedAmmoPouchChance = .8;
let ultimateReady = true;
let ultimateCooldown = 60000;
let lastUltimateTime = performance.now() - ultimateCooldown;
let shockwave = null;
const scoreIdentifier = document.querySelector('.score');
const xpIdentifier = document.querySelector('.xp');
const ammoIdentifier = document.querySelector('.ammo');
const playerHealthBar = document.querySelector('.inner-health-bar');
const music = new Audio('../assets/audio/music.mp3');
const ZOMBIE_TYPES = {
    SMALL: { size: 100, speedMultiplier: 1.5, damageMultiplier: .5, score: 5, xp: 2, health: 50 },
    REGULAR: { size: 150, speedMultiplier: 1, damageMultiplier: 1, score: 10, xp: 5, health: 100 },
    GIANT: { size: 200, speedMultiplier: .7, damageMultiplier: 3, score: 20, xp: 10, health: 150 },
    COLOSSAL: { size: 250, speedMultiplier: .5, damageMultiplier: 5, score: 40, xp: 20, health: 300 }
};
const timer = {
    ms: 0,
    seconds: 0,
    minutes: 0
};
let savedSettings = JSON.parse(localStorage.getItem('settings')) || {
    volume: 1,
    effectsVolume: 1
};
const timerIdentifier = document.querySelector('.timer');
const FRAME_RATE = 60;
const FRAME_DURATION = 1000 / FRAME_RATE;

const playerWidth = player.offsetWidth;
const playerHeight = player.offsetHeight;

function setPlayerSkin(skinName) {
    if (skinName) {
        fetch('../assets/data/skins.json')
            .then(res => res.json())
            .then(data => {
                const skinData = data.find(skin => skin.skin === skinName);
                if (skinData) {
                    if (skinData.hex.includes('+')) {
                        const colors = skinData.hex.split('+');
                        player.style.background = `linear-gradient(to right, ${colors[0]}, ${colors[1]})`;
                    } else {
                        player.style.background = skinData.hex;
                    }
                    playerStats.skin = skinName;
                    localStorage.setItem('playerStats', JSON.stringify(playerStats));

                    const shopContent = document.querySelector('.window-content');
                    if (shopContent) {
                        const skinContainers = shopContent.querySelectorAll('.item-container');
                        skinContainers.forEach(container => {
                            const containerSkinName = container.querySelector('.item-name').innerText;
                            const skinPrice = container.querySelector('.skin-price');
                            if (containerSkinName === skinName) {
                                skinPrice.innerHTML = '<span>Set</span>';
                            } else if (playerStats.itemsBought.includes(containerSkinName)) {
                                skinPrice.innerHTML = '<span>Owned</span>';
                            }
                        });
                    }
                }
            });
    }
}

function initializeGame() {
    setPlayerSkin(playerStats.skin);
}

function loadPlayerStats() {
    return new Promise((resolve) => {
        playerStats = JSON.parse(localStorage.getItem('playerStats')) || {
            skin: 'Black',
            itemsBought: ['Black'],
            coins: 0
        };
        resolve();
    });
}

loadPlayerStats().then(() => {
    initializeGame();
});

music.volume = savedSettings.volume;

const menuAction = {
    play() {
        pause = false;
        document.querySelector('.main-menu').remove();
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mousemove', handleMouseMove);
        requestAnimationFrame(gameLoop);

        music.play();
        music.loop = true;
    },
    settings() {
        const settings = new Window();
        settings.tabs = [
            {
                title: 'Audio',
                id: 'audio',
                active: true,
                content: `
                <div class="settings-section music-volume-section">Music Volume ${parseInt(savedSettings.volume * 100)}%</div>
                <slider-range class="music-volume" min="0" max="100" value="${savedSettings.volume * 100}"></slider-range>
                <div class="settings-section effects-volume-section">Effects Volume ${parseInt(savedSettings.effectsVolume * 100)}%</div>
                <slider-range class="effects-volume" min="0" max="100" value="${savedSettings.effectsVolume * 100}"></slider-range>
                `
            }
        ];
        const win = settings.open();

        const container = win.container;
        const musicVolumeSection = container.querySelector('.music-volume-section');
        const volumeSlider = container.querySelector('.music-volume');
        const effectsVolumeSection = container.querySelector('.effects-volume-section');
        const effectsVolume = container.querySelector('.effects-volume');

        volumeSlider.addEventListener('changing', e => {
            changeVolume(musicVolumeSection, 'Music', 'volume', e);
        });

        effectsVolume.addEventListener('changing', e => {
            changeVolume(effectsVolumeSection, 'Effects', 'effectsVolume', e);
        });

        function changeVolume(section, sectionName, volumeName, event) {
            const newVolume = event.detail.value / 100;
            section.innerText = `${sectionName} Volume ${parseInt(event.detail.value)}%`;
            savedSettings[volumeName] = newVolume;
            localStorage.setItem('settings', JSON.stringify(savedSettings));

            if (volumeName === 'volume') {
                music.volume = newVolume;
            }
        }
    },
    shop() {
        fetch('../assets/data/skins.json')
            .then(res => res.json())
            .then(data => {
                let shopContent = '';
                let detailsContent = '';

                for (let i in data.sort((a, b) => a.price - b.price)) {
                    const backgroundColor = data[i].hex.includes('+')
                        ? `linear-gradient(to right, ${data[i].hex.split('+')[0]}, ${data[i].hex.split('+')[1]})`
                        : data[i].hex;

                    shopContent += `
                    <div class="item-container">
                        <div class="skin-preview" style="background: ${backgroundColor}"></div>
                        <div class="item-name">${data[i].skin}</div>
                        <div class="skin-price">
                        ${(() => {
                            if (playerStats.itemsBought.includes(data[i].skin)) {
                                return `
                                <span>${playerStats.skin === data[i].skin ? 'Set' : 'Owned'}</span>
                                `;
                            } else {
                                return `
                                <span>
                                    <img src="../assets/images/coin.png" height="20" alt="$">
                                </span>
                                <span>${data[i].price.toLocaleString('en-US')}</span>
                                `;
                            }
                        })()}
                        </div>
                    </div>
                    `;

                    detailsContent = `
                    <table class="items-details-table">
                        <thead>
                            <tr>
                                <th>Skin</th>
                                <th>Price</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(item => {
                        const itemBackgroundColor = item.hex.includes('+')
                            ? `linear-gradient(to right, ${item.hex.split('+')[0]}, ${item.hex.split('+')[1]})`
                            : item.hex;

                        return `
                                <tr>
                                    <td>
                                        <div class="skin-preview" style="background: ${itemBackgroundColor}"></div>
                                        ${item.skin}
                                    </td>
                                    <td>
                                        <div class="coin-preview">
                                            <span>
                                                <img src="../assets/images/coin.png" height="20" alt="$">
                                            </span>
                                            <span>${item.price.toLocaleString('en-US')}</span>
                                        </div>
                                    </td>
                                    <td>${item.description || 'A unique player skin'}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                    `;
                }

                const shop = new Window();
                shop.tabs = [
                    {
                        title: 'Shop',
                        id: 'shop',
                        active: true,
                        content: shopContent
                    },
                    {
                        title: 'Item Details',
                        id: 'item-details',
                        active: false,
                        content: detailsContent
                    }
                ];
                const win = shop.open();
                const winContent = win.content;
                winContent.style.gridTemplateColumns = 'repeat(3, 1fr)';
                winContent.style.gridTemplateRows = 'auto 1fr';
                winContent.style.gridGap = '3px';
                shop.updateDisplay();
                changeSize();

                function changeSize() {
                    if (shop.getCurrentTabId() === 'item-details') {
                        shop.updateDimensions(700, 300);
                    } else {
                        shop.updateDimensions(400, 300);
                    }

                    requestAnimationFrame(changeSize);
                }

                const coins = document.createElement('div');
                coins.classList.add('coins');
                coins.innerHTML = `
                <span>
                    <img src="../assets/images/coin.png" height="20" alt="$">
                    </span>
                    <span>${playerStats?.coins.toLocaleString('en-US') || 0}</span>
                `;
                win.main.insertBefore(coins, win.container);

                addSkinContainerListeners(winContent, data, coins);

                Animator.animate({
                    target: coins,
                    duration: 1000,
                    style: 'scale',
                    valueFrom: .5,
                    valueTo: 1,
                    easing: Animator.easings.spring
                }).start();

                shop.onClosing().then(() => {
                    Animator.animate({
                        target: coins,
                        duration: 200,
                        style: 'scale',
                        valueFrom: 1,
                        valueTo: .5,
                        easing: Animator.easings.easeOut
                    }).start();
                });
            });
    },
    tips() {
        const tips = new Window();
        tips.tabs = [
            {
                title: 'Tips',
                id: 'tips',
                active: true,
                content: `
                <div class="tips-container">
                    <h2>Survival Tips</h2>
                    <ul>
                        <li>Keep moving! Zombies are relentless, but they can't overlap each other.</li>
                        <li>There are four types of zombies:
                            <ul>
                                <li>Small: Fast but weak</li>
                                <li>Regular: Balanced speed and strength</li>
                                <li>Giant: Slow but very strong</li>
                                <li>Colossal: Slowest but very strong</li>
                            </ul>
                        </li>
                        <li>Bigger zombies are tougher to kill but give more score and XP when defeated.</li>
                        <li>Manage your ammo carefully. Aim accurately to conserve bullets.</li>
                        <li>Look out for ammo pouches dropped by defeated zombies.</li>
                        <li>Medkits can appear after killing zombies. Grab them to restore health.</li>
                        <li>Use the WASD keys to move and the mouse to aim and shoot.</li>
                        <li>The Shockwave, utilized by RMB, proves to be highly effective in densely scenarios.
                            <ul>
                                <li>Note: If you use The Shockwave, zombies won't drop any item.</li>
                            </ul>
                        </li>
                        <li>If your crosshair is colored red, that means your damage is +${zombieTargetBonusDamage}, which helps you kill zombies faster.</li>
                        <li>Keep an eye on your health bar. If it depletes, it's game over!</li>
                        <li>Zombies spawn more frequently as time passes. Stay alert!</li>
                        <li>Collect coins from defeated zombies to buy new skins in the shop.</li>
                        <li>Different skins are purely cosmetic, but they're fun to collect!</li>
                        <li>If you're overwhelmed, try to funnel zombies through narrow spaces.</li>
                        <li>Prioritize your targets: decide whether to take out the faster small zombies first or focus on the high-value giant zombies.</li>
                        <li>Watch for the floating text when you kill a zombie to see how many points, XP, and coins you've earned.</li>
                        <li>Keep an eye out for XP Stores. They appear periodically and offer valuable upgrades to improve your survival chances.</li>
                        <li>If you're low on health, prioritize finding and collecting medkits. They can be the difference between survival and game over.</li>
                        <li>Upgrade your character strategically in the XP Store. Upgrade yourself based on your playstyle.</li>
                        <li>Learn to kite zombies by moving in circular patterns. This can help you avoid damage while lining up shots.</li>
                        <li>Don't stay in one place for too long. Keep moving to avoid being surrounded by zombies.</li>
                        <li>Practice your aim. Accurate shooting will help you conserve ammo and increase your survival time.</li>
                    </ul>
                </div>
                `
            }
        ];
        tips.width = 600;
        tips.open();
    }
};

function addSkinContainerListeners(winContent, data, coins, interval = 500) {
    const skinContainers = winContent.querySelectorAll('.item-container');

    function updateSkinContainers() {
        skinContainers.forEach(container => {
            const skinName = container.querySelector('.item-name').innerText;
            const skinPrice = container.querySelector('.skin-price');

            if (playerStats.itemsBought.includes(skinName)) {
                if (playerStats.skin === skinName) {
                    skinPrice.innerHTML = '<span>Set</span>';
                } else {
                    skinPrice.innerHTML = '<span>Owned</span>';
                }
            }
        });
    }

    skinContainers.forEach(skin => {
        skin.addEventListener('click', () => {
            const skinName = skin.querySelector('.item-name').innerText;
            const skinData = data.find(item => item.skin === skinName);

            if (playerStats.itemsBought.includes(skinName)) {
                highlight(skin, '#bd3e03', interval);
                setPlayerSkin(skinName);
                updateSkinContainers();
            } else if (playerStats.coins >= skinData.price) {
                playerStats.coins -= skinData.price;
                playerStats.itemsBought.push(skinName);
                coins.querySelector('span:last-child').innerText = playerStats.coins.toLocaleString('en-US');
                setPlayerSkin(skinName);
                localStorage.setItem('playerStats', JSON.stringify(playerStats));
                highlight(skin, 'var(--floor)', interval);
                updateSkinContainers();
            } else {
                highlight(skin, 'var(--bloody-red)', interval);
            }
        });
    });

    updateSkinContainers();

    function highlight(element, color, interval) {
        element.style.transition = 'background 200ms';

        setTimeout(() => {
            element.style.backgroundColor = color;
        });

        setTimeout(() => {
            element.style.backgroundColor = '';
            element.style.removeProperty('transition');
        }, interval);
    }
}

class Window {
    constructor() {
        this.width = 400;
        this.height = 300;
        this.tabs = [];
        this.display = 'block';
        this.closeResolver = null;
    }

    updateDisplay() {
        const currentTabId = this.getCurrentTabId();
        this.display = currentTabId === 'shop' ? 'grid' : 'block';
        if (this.contentElement) {
            this.contentElement.style.display = this.display;
        }
    }

    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        if (this.contentElement) {
            const container = this.contentElement.closest('.window-container');
            if (container) {
                container.style.width = `${this.width}px`;
                container.style.height = `${this.height}px`;
            }
        }
    }

    getCurrentTabId() {
        const activeTab = this.tabs.find(tab => tab.active);
        return activeTab ? activeTab.id : null;
    }

    open() {
        const activeTab = this.tabs.find(tab => tab.active);
        if (!activeTab) {
            this.tabs[0].active = true;
        }

        const window = document.createElement('div');
        window.classList.add('window', 'fullscreen');
        window.style.opacity = 0;
        window.innerHTML = `
        <div class="window-container" style="width: ${this.width}px; height: ${this.height}px; scale: .5;">
            <div class="window-titlebar">
                <div class="window-left-side">
                ${this.tabs.map(tab => `<div class="window-tab ${tab.active ? 'active' : ''}" data-tab-id="${tab.id}">${tab.title}</div>`).join('')}
                </div>
                <div class="window-right-side">
                    <div class="window-close-button">
                        <span class="material-symbols-outlined">close</span>
                    </div>
                </div>
            </div>
            <div class="window-content" style="display: ${this.display};">
                ${this.tabs.find(tab => tab.active).content}
            </div>
        </div>
        `;
        document.body.appendChild(window);

        const container = window.querySelector('.window-container');

        const tabElements = window.querySelectorAll('.window-tab');
        tabElements.forEach(tabElement => {
            tabElement.addEventListener('click', () => {
                this.switchTab(tabElement.dataset.tabId, window);
            });
        });

        const contentElement = window.querySelector('.window-content');
        this.contentElement = contentElement;
        this.updateDisplay();

        setTimeout(() => {
            Animator.animate({
                target: window,
                style: 'opacity',
                valueFrom: 0,
                valueTo: 1,
                duration: 200,
                easing: Animator.easings.easeIn
            }).start();
            Animator.animate({
                target: container,
                style: 'scale',
                valueFrom: .5,
                valueTo: 1,
                duration: 1000,
                easing: Animator.easings.spring
            }).start();
        });

        window.querySelector('.window-close-button').addEventListener('click', () => {
            Animator.animate({
                target: window,
                style: 'opacity',
                valueFrom: 1,
                valueTo: 0,
                duration: 200,
                easing: Animator.easings.easeOut
            }).start();
            Animator.animate({
                target: container,
                style: 'scale',
                valueFrom: 1,
                valueTo: .5,
                duration: 200,
                easing: Animator.easings.easeOut
            }).start();

            if (this.closeResolver) this.closeResolver();

            setTimeout(() => {
                window.remove();
                if (this.closeResolver) this.closeResolver();
            }, 200);
        });

        return {
            main: window,
            container: container,
            content: contentElement
        };
    }

    switchTab(tabId, windowElement) {
        this.tabs.forEach(tab => {
            tab.active = (tab.id === tabId);
        });

        const tabElements = windowElement.querySelectorAll('.window-tab');
        tabElements.forEach(tabElement => {
            tabElement.classList.toggle('active', tabElement.dataset.tabId === tabId);
        });

        const contentElement = windowElement.querySelector('.window-content');
        contentElement.innerHTML = this.tabs.find(tab => tab.active).content;

        this.updateDisplay();

        if (tabId === 'shop') {
            fetch('../assets/data/skins.json')
                .then(res => res.json())
                .then(data => {
                    const coins = windowElement.querySelector('.coins');
                    addSkinContainerListeners(this.contentElement, data, coins);
                });
        }
    }

    onClose() {
        return new Promise(resolve => {
            this.closeResolver = resolve;
        });
    }

    onClosing() {
        return new Promise(resolve => {
            this.closeResolver = resolve;
        });
    }
}

let mouseX = 0;
let mouseY = 0;

function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
}

function handleMouseDown(e) {
    if (e.button === 0) {
        isMouseDown = true;
    }
}

function handleMouseUp(e) {
    if (e.button === 0) {
        isMouseDown = false;
    }
}

function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

function updatePlayerPosition() {
    let newX = playerX;
    let newY = playerY;

    if (keys['w']) newY -= speed;
    if (keys['s']) newY += speed;
    if (keys['a']) newX -= speed;
    if (keys['d']) newX += speed;

    newX = Math.max(playerWidth / 2, Math.min(newX, window.innerWidth - playerWidth / 2));
    newY = Math.max(playerHeight / 2, Math.min(newY, window.innerHeight - playerHeight / 2));

    playerX = newX;
    playerY = newY;

    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;
}

function createProjectile() {
    ammo--;
    ammoIdentifier.innerText = `${ammo}/${maxAmmo}`;

    if (ammo <= 0) {
        ammo = 0;
        ammoIdentifier.innerText = `0/${maxAmmo}`;
        playAudio('empty-gun');
        return null;
    }

    const projectile = document.createElement('img');
    projectile.src = '../assets/images/bullet.png';
    projectile.style.position = 'absolute';
    projectile.style.left = `${playerX}px`;
    projectile.style.top = `${playerY}px`;
    projectile.style.height = '12px';
    projectile.style.transformOrigin = 'center';
    document.body.appendChild(projectile);

    const angle = Math.atan2(mouseY - playerY, mouseX - playerX);
    const velocityX = Math.cos(angle) * projectileSpeed;
    const velocityY = Math.sin(angle) * projectileSpeed;

    const rotation = angle * (180 / Math.PI);
    projectile.style.transform = `rotate(${rotation}deg)`;

    playAudio('shoot');

    return {
        element: projectile,
        x: playerX,
        y: playerY,
        velocityX,
        velocityY,
        rotation,
        isTargetingZombie
    };
}

function updateProjectiles() {
    projectiles = projectiles.filter(projectile => {
        if (!projectile || !projectile.element) {
            return false;
        }

        projectile.x += projectile.velocityX;
        projectile.y += projectile.velocityY;

        if (projectile.x < 0 || projectile.x > window.innerWidth ||
            projectile.y < 0 || projectile.y > window.innerHeight) {
            projectile.element.remove();
            return false;
        }

        projectile.element.style.left = `${projectile.x}px`;
        projectile.element.style.top = `${projectile.y}px`;
        projectile.element.style.transform = `rotate(${projectile.rotation}deg)`;

        let hasCollided = false;
        zombies.forEach(zombie => {
            if (!hasCollided && zombie && zombie.element && checkCollision(projectile.element, zombie.element)) {
                hitZombie(zombie, projectile);
                projectile.element.remove();
                hasCollided = true;
            }
        });

        return !hasCollided;
    });
}

function createZombie() {
    const zombieType = getRandomZombieType();
    const zombie = document.createElement('img');
    zombie.src = '../assets/images/zombie.png';
    zombie.draggable = false;
    zombie.style.position = 'absolute';
    zombie.style.height = `${zombieType.size}px`;
    zombie.style.zIndex = 2;
    zombie.dataset.health = zombieType.health;
    zombie.dataset.type = zombieType.name;

    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -50 : window.innerWidth + 50;
        y = Math.random() * window.innerHeight;
    } else {
        x = Math.random() * window.innerWidth;
        y = Math.random() < 0.5 ? -50 : window.innerHeight + 50;
    }

    zombie.style.left = `${x}px`;
    zombie.style.top = `${y}px`;
    document.body.appendChild(zombie);

    return { element: zombie, x, y, type: zombieType, health: zombieType.health };
}

function getRandomZombieType() {
    const rarityWeights = {
        SMALL: 60,    // Most common
        REGULAR: 35,  // Regular rarity
        GIANT: 20,    // Rare
        COLOSSAL: 10  // Highly rare
    };

    const totalWeight = Object.values(rarityWeights).reduce((sum, weight) => sum + weight, 0);
    const randomNumber = Math.random() * totalWeight;

    let cumulativeWeight = 0;
    for (const [typeName, weight] of Object.entries(rarityWeights)) {
        cumulativeWeight += weight;
        if (randomNumber <= cumulativeWeight) {
            return { name: typeName, ...ZOMBIE_TYPES[typeName] };
        }
    }

    return { name: 'REGULAR', ...ZOMBIE_TYPES.REGULAR };
}

function checkZombieCollision(zombie1, zombie2) {
    const dx = zombie1.x - zombie2.x;
    const dy = zombie1.y - zombie2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (zombie1.type.size + zombie2.type.size) / 2;
    return distance < minDistance;
}

function updateZombies(currentTime) {
    zombies.forEach((zombie, index) => {
        const angle = Math.atan2(playerY - zombie.y, playerX - zombie.x);
        let newX = zombie.x + Math.cos(angle) * zombieSpeed * zombie.type.speedMultiplier;
        let newY = zombie.y + Math.sin(angle) * zombieSpeed * zombie.type.speedMultiplier;

        let collided = false;
        for (let i = 0; i < zombies.length; i++) {
            if (i !== index) {
                const otherZombie = zombies[i];
                const tempZombie = { ...zombie, x: newX, y: newY };
                if (checkZombieCollision(tempZombie, otherZombie)) {
                    collided = true;
                    break;
                }
            }
        }

        if (!collided) {
            zombie.x = newX;
            zombie.y = newY;
        } else {
            const perpendicularAngle = angle + Math.PI / 2;
            zombie.x += Math.cos(perpendicularAngle) * zombieSpeed * zombie.type.speedMultiplier * 0.5;
            zombie.y += Math.sin(perpendicularAngle) * zombieSpeed * zombie.type.speedMultiplier * 0.5;
        }

        zombie.element.style.left = `${zombie.x}px`;
        zombie.element.style.top = `${zombie.y}px`;

        const rotation = angle * (180 / Math.PI);
        zombie.element.style.transform = `rotate(${rotation - 90}deg)`;

        if (checkCollision(player, zombie.element) && currentTime - lastPlayerHitTime > playerHitCooldown) {
            hitPlayer(zombie);
            lastPlayerHitTime = currentTime;
        }
    });
}

function hitPlayer(zombie) {
    const damage = Math.round(zombieDamage * zombie.type.damageMultiplier);
    playerHealth -= damage;
    player.dataset.health = playerHealth.toString();
    playerHealthBar.style.width = `${(playerHealth / 100) * 100}%`;

    if (playerHealth <= 0) {
        gameOver();
    }
}

function gameOver() {
    pause = true;
    const gameOverScreen = document.createElement('div');
    gameOverScreen.classList.add('game-over-screen', 'fullscreen');
    gameOverScreen.innerHTML = `
    <h1 class="fullscreen-title">Game Over</h1>
    <div class="fullscreen-items">
        <button role="button" class="btn" data-menu-action="tips">Tips</button>
        <button role="button" class="btn" onclick="location.reload();">Main Menu</button>
    </div>
    `;
    document.body.appendChild(gameOverScreen);
    triggerButtonHover();
}

function checkCollision(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    return !(rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom);
}

function hitZombie(zombie) {
    const currentDamage = isTargetingZombie ? playerDamage + zombieTargetBonusDamage : playerDamage;
    zombie.health -= currentDamage;
    zombie.element.dataset.health = zombie.health.toString();

    if (zombie.health <= 0) {
        const zombieType = zombie.type;
        const scoreEarned = zombieType.score;
        const xpEarned = zombieType.xp;
        const coinsEarned = Math.floor(Math.floor(Math.random() * 10) + zombieType.score / 2);

        score += scoreEarned;
        scoreIdentifier.innerText = `Score: ${score}`;

        xp += xpEarned;
        xpIdentifier.innerText = `XP: ${xp}`;

        createFloatingText(zombie.x, zombie.y, `+${scoreEarned} Score`, 'earned-score');
        createFloatingText(zombie.x, zombie.y + 30, `+${xpEarned} XP`, 'earned-xp');
        createFloatingText(zombie.x, zombie.y + 60, `+${coinsEarned} Coins`, 'earned-coins');

        playerStats.coins += coinsEarned;
        localStorage.setItem('playerStats', JSON.stringify(playerStats));

        if (Math.random() < dropChance) {
            let itemType;
            if (ammo < lowAmmoThreshold) {
                itemType = Math.random() < increasedAmmoPouchChance ? 'ammo-pouch' : 'medkit';
            } else {
                itemType = Math.random() < normalAmmoPouchChance ? 'ammo-pouch' : 'medkit';
            }

            const dropItem = document.createElement('img');
            dropItem.src = `./assets/images/${itemType}.png`;
            dropItem.draggable = false;
            dropItem.height = 40;
            dropItem.style.position = 'fixed';
            dropItem.style.left = `${zombie.x + zombie.type.size / 2}px`;
            dropItem.style.top = `${zombie.y + zombie.type.size / 2}px`;
            document.body.appendChild(dropItem);
            droppedItems.push({ element: dropItem, type: itemType, x: zombie.x + zombie.type.size / 2, y: zombie.y + zombie.type.size / 2 });
        }

        zombie.element.remove();
        zombies = zombies.filter(z => z !== zombie);
    }
}

function createFloatingText(x, y, text, className) {
    const floatingText = document.createElement('div');
    floatingText.innerText = text;
    floatingText.classList.add(className);
    floatingText.style.left = `${x}px`;
    floatingText.style.top = `${y}px`;
    document.body.appendChild(floatingText);

    Animator.animate({
        target: floatingText,
        duration: 1000,
        style: 'opacity',
        valueFrom: 1,
        valueTo: 0
    }).start();

    Animator.animate({
        target: floatingText,
        duration: 1000,
        style: 'transform',
        valueFrom: 0,
        valueTo: -50,
        surroundLeft: 'translateY(',
        surroundRight: 'px)'
    }).start();

    setTimeout(() => floatingText.remove(), 1000);
}

function checkItemCollisions() {
    droppedItems = droppedItems.filter(item => {
        if (checkCollision(player, item.element)) {
            if (item.type === 'ammo-pouch') {
                ammo = Math.min(ammo + Math.round(maxAmmo / 2), maxAmmo);
                ammoIdentifier.innerText = `${ammo}/${maxAmmo}`;
                playAudio('ammo-pouch');
            } else if (item.type === 'medkit') {
                playerHealth = Math.min(playerHealth + 25, 100);
                playerHealthBar.style.width = `${(playerHealth / 100) * 100}%`;
                playAudio('medkit');
            }
            item.element.remove();
            return false;
        }
        return true;
    });

    xpStores = xpStores.filter(store => {
        if (checkCollision(player, store.element)) {
            openXpStore(store);
            return false;
        }
        return true;
    });
}

function playAudio(fileName) {
    const audio = new Audio(`../assets/audio/${fileName}.mp3`);
    audio.volume = savedSettings.effectsVolume;
    audio.play();
    return audio;
}

function openXpStore(store) {
    fetch('../assets/data/xp-store.json')
        .then(res => res.json())
        .then(data => {
            pause = true;
            const storeWindow = new Window();
            storeWindow.width = 600;

            let content = '';

            for (let i in data.sort((a, b) => a.name.localeCompare(b.name))) {
                content += `
                <div class="item-container" data-title="${data[i].description}" data-index="${i}">
                    <img src="../assets/images/${data[i].image}.png" height="60" draggable="false" alt="${data[i].name}">
                    <div class="item-name">${data[i].name}</div>
                    <div class="xp-required">${data[i].xpRequired}</div>
                </div>
                `;
            }

            storeWindow.tabs = [
                {
                    title: 'XP Store',
                    id: 'xp-store',
                    active: true,
                    content: content
                }
            ];
            const win = storeWindow.open();
            const winContent = win.content;

            storeWindow.onClose().then(() => {
                document.querySelectorAll('.item-title').forEach(item => item.remove());
            });

            winContent.style.display = 'grid';
            winContent.style.gridTemplateColumns = 'repeat(3, 1fr)';
            winContent.style.gridTemplateRows = 'auto 1fr';
            winContent.style.gridGap = '3px';

            let titleElement = null;

            winContent.querySelectorAll('.item-container').forEach(item => {
                item.addEventListener('click', () => {
                    const index = item.getAttribute('data-index');
                    const selectedItem = data[index];

                    if (xp < selectedItem.xpRequired) {
                        alert('Not enough XP');
                        return false;
                    }

                    xp -= selectedItem.xpRequired;
                    xpIdentifier.innerText = `XP: ${xp}`;

                    switch (selectedItem.name) {
                        case 'Ammo Capacity':
                            maxAmmo += 10;
                            ammo = maxAmmo;
                            ammoIdentifier.innerText = `${ammo}/${maxAmmo}`;
                            break;
                        case 'Damage':
                            playerDamage += 10;
                            break;
                        case 'Health':
                            maxPlayerHealth += 50;
                            playerHealth = maxPlayerHealth;
                            player.dataset.health = playerHealth;
                            break;
                        case 'Speed':
                            speed += 5;
                            break;
                        case 'Shrink':
                            player.style.width = `${player.offsetWidth - 10}px`;
                            player.style.height = `${player.offsetHeight - 10}px`;
                            break;
                        case 'Bullet Speed':
                            projectileSpeed += 5;
                            break;
                    }
                });

                item.addEventListener('mouseover', e => {
                    if (!titleElement) {
                        titleElement = document.createElement('div');
                        titleElement.innerText = item.getAttribute('data-title');
                        titleElement.classList.add('item-title');
                        document.body.appendChild(titleElement);
                    }
                    updateTitlePosition(e);
                });

                item.addEventListener('mousemove', updateTitlePosition);

                item.addEventListener('mouseout', () => {
                    if (titleElement) {
                        document.body.removeChild(titleElement);
                        titleElement = null;
                    }
                });
            });

            function updateTitlePosition(e) {
                if (titleElement) {
                    titleElement.style.left = `${e.clientX + 10}px`;
                    titleElement.style.top = `${e.clientY + 10}px`;
                }
            }

            storeWindow.onClose().then(() => {
                pause = false;
                store.element.remove();
                requestAnimationFrame(gameLoop);
            });
        });
}

function createXpStore() {
    const xpStore = document.createElement('img');
    xpStore.classList.add('xp-store');
    xpStore.draggable = false;
    xpStore.src = '../assets/images/xp-store.png';
    xpStore.height = 50;
    xpStore.style.position = 'fixed';
    xpStore.style.left = `${Math.random() * (window.innerWidth - 100)}px`;
    xpStore.style.top = `${Math.random() * (window.innerHeight - 100)}px`;
    document.body.appendChild(xpStore);
    xpStores.push({ element: xpStore, x: parseFloat(xpStore.style.left), y: parseFloat(xpStore.style.top) });
}

function updateTimer() {
    timer.ms++;
    if (timer.ms >= 60) {
        timer.seconds++;
        timer.ms = 0;
    }
    if (timer.seconds >= 60) {
        timer.minutes++;
        timer.seconds = 0;
    }
    timerIdentifier.innerText = `${addZero(timer.minutes)}:${addZero(timer.seconds)}:${addZero(timer.ms)}`;
}

function createShockwave() {
    if (!ultimateReady) return;

    ultimateReady = false;
    lastUltimateTime = performance.now();
    document.querySelector('.ultimate-cooldown').classList.remove('ready');

    shockwave = {
        element: document.createElement('div'),
        radius: 0,
        maxRadius: Math.max(window.innerWidth, window.innerHeight),
        x: playerX,
        y: playerY
    };

    shockwave.element.classList.add('shockwave');
    document.body.appendChild(shockwave.element);

    updateShockwave();
}

function updateShockwave() {
    if (!shockwave) return;

    shockwave.radius += 10;
    shockwave.element.style.width = `${shockwave.radius * 2}px`;
    shockwave.element.style.height = `${shockwave.radius * 2}px`;
    shockwave.element.style.left = `${shockwave.x - shockwave.radius}px`;
    shockwave.element.style.top = `${shockwave.y - shockwave.radius}px`;

    zombies = zombies.filter(zombie => {
        const dx = zombie.x - shockwave.x;
        const dy = zombie.y - shockwave.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= shockwave.radius) {
            zombie.element.remove();
            score += zombie.type.score;
            xp += zombie.type.xp;
            scoreIdentifier.innerText = `Score: ${score}`;
            xpIdentifier.innerText = `XP: ${xp}`;
            return false;
        }
        return true;
    });

    if (shockwave.radius >= shockwave.maxRadius) {
        shockwave.element.remove();
        shockwave = null;
    } else {
        requestAnimationFrame(updateShockwave);
    }
}

document.addEventListener('mousemove', e => {
    crosshair.style.left = `${e.clientX - crosshair.offsetWidth / 2}px`;
    crosshair.style.top = `${e.clientY - crosshair.offsetHeight / 2}px`;

    const element = document.elementFromPoint(e.clientX, e.clientY);
    const img = element ? element.closest('img') : null;

    if (img && img.src.endsWith('zombie.png')) {
        crosshair.style.setProperty('--color', 'var(--brighter-bloody-red)');
        isTargetingZombie = true;
    } else {
        crosshair.style.removeProperty('--color');
        isTargetingZombie = false;
    }
});

document.addEventListener('mouseleave', () => {
    crosshair.style.display = 'none';
});

document.addEventListener('mouseenter', () => {
    crosshair.style.removeProperty('display');
});

let lastFrameTime = 0;
let accumulatedTime = 0;

function gameLoop(currentTime) {
    if (pause) {
        requestAnimationFrame(gameLoop);
        return;
    }

    accumulatedTime += currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    while (accumulatedTime >= FRAME_DURATION) {
        updateGame(currentTime, FRAME_DURATION);
        accumulatedTime -= FRAME_DURATION;
    }

    render();
    requestAnimationFrame(gameLoop);
}

function updateGame(currentTime) {
    updatePlayerPosition();

    if (isMouseDown && currentTime - lastShootTime > shootInterval) {
        const newProjectile = createProjectile();
        if (newProjectile) {
            projectiles.push(newProjectile);
        }
        lastShootTime = currentTime;
    }

    if (currentTime - lastZombieSpawnTime > zombieSpawnInterval) {
        zombies.push(createZombie());
        lastZombieSpawnTime = currentTime;
    }

    if (currentTime - lastXpStoreSpawnTime > xpStoreSpawnInterval) {
        createXpStore();
        lastXpStoreSpawnTime = currentTime;
    }

    currentTime = performance.now();

    if (!ultimateReady && currentTime - lastUltimateTime >= ultimateCooldown) {
        ultimateReady = true;
        lastUltimateTime = currentTime;
        document.querySelector('.ultimate-cooldown').classList.add('ready');
    }

    const cooldownPercentage = ultimateReady ? 1 : (currentTime - lastUltimateTime) / ultimateCooldown;
    document.documentElement.style.setProperty('--cooldown', `${cooldownPercentage * 100}%`);

    updateProjectiles();
    updateZombies(currentTime);
    checkItemCollisions();
    updateTimer();
}

function render() {
    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;

    projectiles.forEach(projectile => {
        projectile.element.style.left = `${projectile.x}px`;
        projectile.element.style.top = `${projectile.y}px`;
    });

    zombies.forEach(zombie => {
        zombie.element.style.left = `${zombie.x}px`;
        zombie.element.style.top = `${zombie.y}px`;
    });

    playerHealthBar.style.width = `${(playerHealth / maxPlayerHealth) * 100}%`;
    scoreIdentifier.innerText = `Score: ${score}`;
    xpIdentifier.innerText = `XP: ${xp}`;
    ammoIdentifier.innerText = `${ammo}/${maxAmmo}`;
    timerIdentifier.innerText = `${addZero(timer.minutes)}:${addZero(timer.seconds)}:${addZero(timer.ms)}`;
}

function addZero(value) {
    return value < 10 ? `0${value}` : value;
}

requestAnimationFrame(timestamp => {
    lastFrameTime = timestamp;
    gameLoop(timestamp);
});

function triggerButtonHover() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', () => {
            menuAction[btn.getAttribute('data-menu-action')]();
        });

        btn.addEventListener('mouseover', () => {
            Animator.animate({
                target: btn,
                duration: 1000,
                style: 'scale',
                valueFrom: 1,
                valueTo: 1.2,
                easing: Animator.easings.spring
            }).start();
        });

        btn.addEventListener('mouseout', () => {
            Animator.animate({
                target: btn,
                duration: 1000,
                style: 'scale',
                valueFrom: 1.2,
                valueTo: 1,
                easing: Animator.easings.spring
            }).start();
        });
    });
}

triggerButtonHover();

document.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!document.querySelector('.fullscreen')) createShockwave();
});

class Animator {
    static easings = {
        linear: t => t,
        easeIn: t => t * t,
        easeOut: t => t * (2 - t),
        easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        spring: t => 1 - Math.cos(t * 4.5 * Math.PI) * Math.exp(-6 * t),
        elastic: t => t === 0 || t === 1 ? t : -Math.pow(2, 8 * (t - 1)) * Math.sin(((t - 1) * 80 - 7.5) * Math.PI / 15)
    };

    static animate({ target, duration, style, valueFrom, valueTo, easing = Animator.easings.linear, surroundLeft = '', surroundRight = '' }) {
        let start, requestId;

        const startAnimation = (timestamp) => {
            if (!start) start = timestamp;
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);

            const currentValue = valueFrom + (valueTo - valueFrom) * easedProgress;
            target.style[style] = `${surroundLeft}${currentValue}${surroundRight}`;

            if (progress < 1) {
                requestId = requestAnimationFrame(startAnimation);
            }
        };

        const stopAnimation = () => {
            cancelAnimationFrame(requestId);
        };

        return {
            start: () => {
                requestId = requestAnimationFrame(startAnimation);
            },
            stop: stopAnimation
        };
    }
}

class SliderRange extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                .slider {
                    width: 100%;
                    height: 5px;
                    position: relative;
                    border-radius: 8px;
                    background-color: #444;
                }
                .slider-thumb {
                    width: 14px;
                    height: 14px;
                    background: var(--bloody-red);
                    border-radius: 50%;
                    position: absolute;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    transition: background 200ms;
                }
                .slider-thumb:hover {
                    background: var(--brighter-bloody-red);
                }
                .slider-track {
                    height: 100%;
                    background: var(--bloody-red);
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    border-radius: 8px;
                }
            </style>
            <div class="slider">
                <div class="slider-track"></div>
                <div class="slider-thumb"></div>
            </div>
        `;

        this.slider = this.shadowRoot.querySelector('.slider');
        this.thumb = this.shadowRoot.querySelector('.slider-thumb');
        this.track = this.shadowRoot.querySelector('.slider-track');

        this.min = this.getAttribute('min') || 0;
        this.max = this.getAttribute('max') || 100;
        this.value = this.getAttribute('value') || 0;

        this.updateThumbPosition(this.value);

        this.thumb.addEventListener('mousedown', this.startDrag.bind(this));
        document.addEventListener('mousemove', this.onDrag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));
    }

    startDrag(event) {
        this.isDragging = true;
        this.dispatchEvent(new CustomEvent('changing', { detail: { value: this.value } }));
    }

    onDrag(event) {
        if (!this.isDragging) return;
        const rect = this.slider.getBoundingClientRect();
        let newValue = ((event.clientX - rect.left) / rect.width) * (this.max - this.min) + this.min;
        newValue = Math.min(Math.max(newValue, this.min), this.max);
        this.updateThumbPosition(newValue);
        this.dispatchEvent(new CustomEvent('changing', { detail: { value: newValue } }));
    }

    endDrag(event) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.dispatchEvent(new CustomEvent('released', { detail: { value: this.value } }));
    }

    updateThumbPosition(value) {
        const percentage = ((value - this.min) / (this.max - this.min)) * 100;
        this.thumb.style.left = `${percentage}%`;
        this.track.style.width = `${percentage}%`;
        this.value = value;
    }

    static get observedAttributes() {
        return ['min', 'max', 'value'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        this[name] = newValue;
        this.updateThumbPosition(this.value);
    }
}

customElements.define('slider-range', SliderRange);

let debug = {
    toggle: localStorage.getItem('debug-mode') === 'dbg-1',
    code: '',
    successful: false,
    description: ''
};

const debugActions = {
    addcoins() {
        playerStats.coins += 100000;
        localStorage.setItem('playerStats', JSON.stringify(playerStats));
        debug.description = 'You have been given 100000 coins';
    },
    giveallskins() {
        fetch('../assets/data/skins.json')
            .then(res => res.json())
            .then(data => {
                playerStats.itemsBought = data.map(item => item.skin);
                localStorage.setItem('playerStats', JSON.stringify(playerStats));
            });
        debug.description = 'You have been given all skins';
    },
    removeallskins() {
        playerStats.itemsBought = ['Black'];
        playerStats.skin = 'Black';
        localStorage.setItem('playerStats', JSON.stringify(playerStats));
        player.style.background = '#000';
        debug.description = 'You have been removed all skins';
    },
    setskingradient() {
        const first = prompt('Give first color name or HEX code');
        const second = prompt('Give second color name or HEX code');
        const direction = prompt('Give direction (top, right, bottom, or left)');
        player.style.background = `linear-gradient(${direction.match(/^(\d+)/) ? `${direction}deg` : `to ${direction}`}, ${first}, ${second})`;
        debug.description = 'You have set the skin gradient';
    },
    setskinsolid() {
        const color = prompt('Give a color or a HEX code');
        player.style.background = color;
        debug.description = 'You have set the skin solid';
    },
    infhealth() {
        setInterval(() => {
            playerHealth = Infinity;
            player.dataset.health = playerHealth;
        }, 100);
        debug.description = 'You have been given infinite health';
    },
    killzombies() {
        zombies = [];
        document.querySelectorAll('img[src="../assets/images/zombie.png"]').forEach(zombie => zombie.remove());
        debug.description = 'All the zombies have been killed';
    },
    giveammo() {
        ammo = maxAmmo;
        ammoIdentifier.innerText = `${ammo}/${maxAmmo}`;
        debug.description = 'You have ammo now';
    },
    givexp() {
        xp += 100000;
        xpIdentifier.innerText = `XP: ${xp}`;
        debug.description = 'You have been given 100000 XP';
    }
};

if (debug.toggle) {
    document.addEventListener('keyup', e => {
        debug.code += e.key;
        for (let key in debugActions) {
            if (debug.code.endsWith(key)) {
                debugActions[key]();
                debug.successful = true;
                break;
            }
        }
        if (debug.successful) {
            debug.code = '';
            debug.successful = false;
            const notifier = new Window();
            notifier.tabs = [
                {
                    title: 'Success',
                    id: 'success',
                    active: true,
                    content: `<h1>Cheat Activated!</h1><p style="font-size: 21px;">${debug.description || 'No description provided'}.</p>`
                }
            ];
            notifier.open();
        }
    });
}