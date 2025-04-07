// 記錄前一次報價
let previousPrices = {};

// 幣種清單
const cryptoList = [
    { id: "btc", name: "BTC", icon: "https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg", apiId: "bitcoin" },
    { id: "eth", name: "ETH", icon: "https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg", apiId: "ethereum" },
    { id: "doge", name: "DOGE", icon: "https://upload.wikimedia.org/wikipedia/en/d/d0/Dogecoin_Logo.png", apiId: "dogecoin" },
    { id: "ada", name: "ADA", icon: "https://cryptologos.cc/logos/cardano-ada-logo.png", apiId: "cardano" },
    { id: "shib", name: "SHIB", icon: "https://cryptologos.cc/logos/shiba-inu-shib-logo.png", apiId: "shiba-inu" },
    { id: "sol", name: "SOL", icon: "https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png", apiId: "solana" }
];

// 儲存交易紀錄
let tradeHistory = JSON.parse(localStorage.getItem("tradeHistory")) || [];

// 初始化前一次報價
cryptoList.forEach(crypto => {
    previousPrices[crypto.apiId] = 0;
});

// 更新表格顯示
function updateTable() {
    const tableBody = document.getElementById("crypto-table-body");
    tableBody.innerHTML = ""; // 清空表格內容

    tradeHistory.forEach((record, index) => {
        const crypto = cryptoList.find(c => c.id === record.cryptoId);
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${crypto.name}</td>
            <td>${record.amount}</td>
            <td>NT$ ${record.price.toFixed(2)}</td>
            <td>NT$ ${(record.amount * (previousPrices[crypto.apiId] || 0) - record.amount * record.price).toFixed(2)}</td>
            <td><button onclick="deleteRecord(${index})">刪除</button></td>
        `;
        
        tableBody.appendChild(row);
    });
}

// 新增交易記錄
function addRecord() {
    const cryptoId = prompt("輸入幣種ID（例如：btc、eth）:");
    const amount = parseFloat(prompt("輸入持倉數量:"));
    const price = parseFloat(prompt("輸入購入價格:"));

    // 查找對應的加密貨幣資料
    const crypto = cryptoList.find(c => c.id === cryptoId);
    
    if (crypto && !isNaN(amount) && !isNaN(price)) {
        const newRecord = { cryptoId, amount, price };
        tradeHistory.push(newRecord);

        // 更新表格顯示
        updateTable();
        
        // 儲存至 localStorage
        localStorage.setItem("tradeHistory", JSON.stringify(tradeHistory));
    } else {
        alert("輸入無效，請重新嘗試！");
    }
}

// 刪除交易記錄
function deleteRecord(index) {
    if (confirm("確定刪除此記錄嗎？")) {
        tradeHistory.splice(index, 1); // 刪除指定的記錄

        // 更新表格顯示
        updateTable();

        // 更新 localStorage
        localStorage.setItem("tradeHistory", JSON.stringify(tradeHistory));
    }
}

// 動態生成 crypto-box
function generateCryptoBoxes() {
    const container = document.getElementById("crypto-container");
    container.innerHTML = ""; // 清空現有內容

    cryptoList.forEach(crypto => {
        container.innerHTML += `
            <div class="crypto-info">
                <h1 class="title">
                    <img src="${crypto.icon}" alt="${crypto.name}圖案" class="icon">
                    ${crypto.name}
                </h1>
                <div class="crypto-prices">
                    <p class="crypto-item" id="${crypto.id}-price">NT<span>$0.00</span></p>
                    <p class="crypto-holdings" id="${crypto.id}-holdings">持倉數量: 0</p>
                    <p class="crypto-profit" id="${crypto.id}-profit">持倉獲利: NT$ 0.00</p>
                </div>
            </div>
        `;
    });
}

// 從 CoinGecko API 抓取即時報價
async function fetchCryptoPrices() {
    try {
        const apiIds = cryptoList.map(crypto => crypto.apiId).join(",");
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${apiIds}&vs_currencies=twd`
        );
        const data = await response.json();

        cryptoList.forEach(crypto => {
            const currentPrice = data[crypto.apiId]?.twd || 0;
            updatePriceDisplay(`${crypto.id}-price`, currentPrice, previousPrices[crypto.apiId]);
            previousPrices[crypto.apiId] = currentPrice;
        });

        updateHoldingsAndProfit();
        updateTotalProfitAndROI();  // 更新總獲利與總報酬率
    } catch (error) {
        console.error("獲取報價失敗", error);
    }
}

// 更新價格顯示
function updatePriceDisplay(elementId, currentPrice, previousPrice) {
    const priceElement = document.getElementById(elementId);
    const priceChange = currentPrice - previousPrice;

    // 更新價格顯示
    priceElement.querySelector("span").textContent = currentPrice.toFixed(2);

    // 顯示價格變化（顯示綠色或紅色）
    if (priceChange > 0) {
        priceElement.style.color = "green";
    } else if (priceChange < 0) {
        priceElement.style.color = "red";
    } else {
        priceElement.style.color = "black";
    }
}

// 更新持倉與獲利
function updateHoldingsAndProfit() {
    tradeHistory.forEach(record => {
        const crypto = cryptoList.find(c => c.id === record.cryptoId);
        const currentPrice = previousPrices[crypto.apiId] || 0;
        const holdingsElement = document.getElementById(`${crypto.id}-holdings`);
        const profitElement = document.getElementById(`${crypto.id}-profit`);
        
        holdingsElement.textContent = `持倉數量: ${record.amount}`;
        profitElement.textContent = `持倉獲利: NT$ ${(record.amount * currentPrice - record.amount * record.price).toFixed(2)}`;
    });
}

// 更新總獲利與總報酬率
function updateTotalProfitAndROI() {
    const totalProfitElement = document.getElementById("total-profit");
    let totalProfit = 0;
    let totalInvestment = 0;

    tradeHistory.forEach(record => {
        const crypto = cryptoList.find(c => c.id === record.cryptoId);
        const currentPrice = previousPrices[crypto.apiId] || 0;
        totalProfit += record.amount * currentPrice - record.amount * record.price;
        totalInvestment += record.amount * record.price;
    });

    totalProfitElement.textContent = `總獲利: NT$ ${totalProfit.toFixed(2)}`;
    const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
    document.getElementById("total-roi").textContent = `總報酬率: ${roi.toFixed(2)}%`;
}

// 初始頁面設置
function initializeApp() {
    generateCryptoBoxes();  // 生成加密貨幣信息
    fetchCryptoPrices();  // 獲取即時價格
    updateTable();  // 更新交易記錄
}

// 設置每30秒刷新一次價格
setInterval(fetchCryptoPrices, 30000);

// 執行初始化
initializeApp();

// 添加新增記錄的事件處理
document.getElementById("add-record-btn").addEventListener("click", addRecord);
