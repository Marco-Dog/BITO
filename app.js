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
        // 初始化前一次報價
        previousPrices[crypto.apiId] = 0;
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

// 更新持倉數量和獲利
function updateHoldingsAndProfit() {
    cryptoList.forEach(crypto => {
        const currentPrice = previousPrices[crypto.apiId] || 0;
        let holdingsQuantity = 0;
        let totalCost = 0;

        tradeHistory.forEach(trade => {
            if (trade.currency === crypto.name) {
                if (trade.type === "BUY") {
                    holdingsQuantity += trade.quantity;
                    totalCost += trade.price * trade.quantity;
                } else if (trade.type === "SELL") {
                    holdingsQuantity -= trade.quantity;
                    totalCost -= trade.price * trade.quantity;
                }
            }
        });

        const marketValue = holdingsQuantity * currentPrice;
        const profit = marketValue - totalCost;

        // 更新顯示
        document.getElementById(`${crypto.id}-holdings`).textContent = `持倉數量: ${holdingsQuantity}`;
        document.getElementById(`${crypto.id}-profit`).textContent = `持倉獲利: NT$ ${profit.toFixed(2)}`;
    });
}

// 更新總持倉獲利與總投資報酬率
function updateTotalProfitAndROI() {
    let totalProfit = 0;
    let totalInvestment = 0;

    let holdings = {}; // 用來儲存每個幣別的總持倉數量與成本
    let totalCost = {}; // 儲存每個幣別的總成本

    // 計算每個幣別的持倉數量和總成本
    tradeHistory.forEach(trade => {
        if (!holdings[trade.currency]) {
            holdings[trade.currency] = 0;
            totalCost[trade.currency] = 0;
        }
        if (trade.type === "BUY") {
            holdings[trade.currency] += trade.quantity; // 增加持有數量
            totalCost[trade.currency] += trade.price * trade.quantity; // 增加總成本
        } else if (trade.type === "SELL") {
            holdings[trade.currency] -= trade.quantity; // 減少持有數量
            totalCost[trade.currency] -= trade.price * trade.quantity; // 減少總成本
        }
    });

    // 計算每個幣別的總持倉獲利
    cryptoList.forEach(crypto => {
        const currentPrice = previousPrices[crypto.apiId] || 0;
        const quantity = holdings[crypto.name] || 0;
        const cost = totalCost[crypto.name] || 0;
        const marketValue = currentPrice * quantity;
        const profit = marketValue - cost;

        totalProfit += profit; // 累加總獲利
        totalInvestment += cost; // 累加總成本
    });

    const totalROI = totalInvestment > 0 ? (totalProfit / totalInvestment * 100).toFixed(2) : 0;

    // 顯示總獲利與報酬率
    document.getElementById("total-profit").textContent = `總持倉獲利: NT$ ${totalProfit.toFixed(2)}`;
    document.getElementById("total-roi").textContent = `總報酬率: ${totalROI}%`;
}

// 每 10 秒更新一次報價
generateCryptoBoxes(); // 初次載入
fetchCryptoPrices(); // 初次載入即時報價
setInterval(fetchCryptoPrices, 10000); // 定時更新報價

// 初次更新交易紀錄
updateTradeTable();
updateHoldingsAndProfit(); // 初次更新持倉與獲利
updateTotalProfitAndROI(); // 初次更新總獲利與報酬率

// 交易處理
document.getElementById("transactionForm").addEventListener("submit", function(event) {
    event.preventDefault();
    handleTrade();
});

// 交易處理
function handleTrade() {
    const date = document.getElementById("date").value;
    const currency = document.getElementById("currency").value;
    const type = document.getElementById("type").value;
    const price = parseFloat(document.getElementById("price").value);
    const quantity = parseFloat(document.getElementById("quantity").value);
    const note = document.getElementById("note").value;

    if (!date || isNaN(price) || isNaN(quantity) || quantity <= 0 || price <= 0) {
        alert("請輸入有效的交易資料");
        return;
    }
    addTradeRecord(date, currency, type, price, quantity, note);
    document.getElementById("transactionForm").reset();
    updateHoldingsAndProfit();
    updateTotalProfitAndROI(); // 更新總獲利與總報酬率
}

// 新增交易紀錄
function addTradeRecord(date, currency, type, price, quantity, note) {
    const trade = { date, currency, type, price, quantity, note };
    tradeHistory.push(trade);
    localStorage.setItem("tradeHistory", JSON.stringify(tradeHistory));
    updateTradeTable();
    updateHoldingsAndProfit();  // 確保每次新增後更新持倉與獲利
    updateTotalProfitAndROI();  // 確保每次新增後更新總獲利與報酬率
}

// 更新交易表格
function updateTradeTable() {
    const tableBody = document.getElementById("transactionForm").getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ""; // 清空現有表格內容

    tradeHistory.forEach((trade, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${trade.date}</td>
            <td>${trade.currency}</td>
            <td>${trade.type}</td>
            <td>${trade.price}</td>
            <td>${trade.quantity}</td>
            <td>${(trade.price * trade.quantity * 0.001).toFixed(2)}</td>
            <td>${trade.note}</td>
            <td><button onclick="deleteTransaction(${index})">刪除</button></td>
        `;
        tableBody.appendChild(row);
    });
}

// 刪除交易紀錄
function deleteTransaction(index) {
    // 刪除指定索引的交易紀錄
    tradeHistory.splice(index, 1);
    localStorage.setItem("tradeHistory", JSON.stringify(tradeHistory)); // 更新 localStorage
    updateTradeTable(); // 更新顯示
    updateHoldingsAndProfit(); // 更新獲利
    updateTotalProfitAndROI();  // 更新總獲利與總報酬率
}

// 切換頁籤的函式
function switchTab(tabId) {
    // 先隱藏所有頁籤
    const tabs = document.getElementsByClassName("tabcontent");
    for (let tab of tabs) {
        tab.style.display = "none";
    }

    // 顯示所選的頁籤
    const activeTab = document.getElementById(tabId);
    activeTab.style.display = "block";

    // 更新按鈕的 "active" 狀態
    const buttons = document.getElementsByClassName("tab-button");
    for (let button of buttons) {
        button.classList.remove("active");
    }

    // 為當前按鈕添加 "active" 類別
    const activeButton = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    activeButton.classList.add("active");
}
