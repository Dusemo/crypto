
const cryptoList = document.getElementById('crypto-list');
const moversList = document.getElementById('movers-list');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const loadingElement = document.getElementById('loading');
const contactForm = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');
const coinModal = document.getElementById('coin-modal');
const closeModal = document.querySelector('.close');
const modalTitle = document.getElementById('modal-title');


const EMAILJS_SERVICE_ID = 'service_s2y6blc';
const EMAILJS_TEMPLATE_ID = 'template_ml3niqr';



let coins = [];
let chart = null;


document.addEventListener('DOMContentLoaded', () => {
  fetchCoins();
  setupEventListeners();
  
  setInterval(fetchCoins, 60000);
});


function setupEventListeners() {
  
  searchInput.addEventListener('input', filterCoins);
  
  
  sortSelect.addEventListener('change', sortCoins);
  
  contactForm.addEventListener('submit', handleFormSubmit);
  
  closeModal.addEventListener('click', () => {
    coinModal.classList.add('hidden');
    if (chart) {
      chart.destroy();
      chart = null;
    }
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === coinModal) {
      coinModal.classList.add('hidden');
      if (chart) {
        chart.destroy();
        chart = null;
      }
    }
  });
}
async function fetchCoins() {
  showLoading();
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false'
    );
    
    if (!response.ok) throw new Error('Failed to fetch data');
    
    coins = await response.json();
    renderCoins(coins);
    renderTopMovers(coins);
  } catch (error) {
    console.error('Error fetching coins:', error);
    cryptoList.innerHTML = '<p class="error">Failed to load crypto data. Please try again later.</p>';
  } finally {
    hideLoading();
  }
}


function showLoading() {
  loadingElement.classList.remove('hidden');
}

function hideLoading() {
  loadingElement.classList.add('hidden');
}


function renderCoins(coinsToRender) {
  cryptoList.innerHTML = '';
  
  coinsToRender.forEach(coin => {
    const coinCard = document.createElement('div');
    coinCard.className = 'coin-card';
    coinCard.dataset.id = coin.id;
    
    const changeClass = coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
    const changeSymbol = coin.price_change_percentage_24h >= 0 ? '+' : '';
    
    coinCard.innerHTML = `
      <div class="coin-header">
        <img src="${coin.image}" alt="${coin.name}" class="coin-image">
        <div>
          <span class="coin-name">${coin.name}</span>
          <span class="coin-symbol">${coin.symbol}</span>
        </div>
      </div>
      <div class="coin-body">
        <div class="coin-price">$${coin.current_price.toLocaleString()}</div>
        <div class="coin-change ${changeClass}">
          ${changeSymbol}${coin.price_change_percentage_24h.toFixed(2)}%
        </div>
        <div class="coin-market-cap">Market Cap: $${(coin.market_cap / 1e9).toFixed(2)}B</div>
      </div>
    `;
    
    coinCard.addEventListener('click', () => showCoinModal(coin));
    cryptoList.appendChild(coinCard);
  });
}


function renderTopMovers(coinsToRender) {
  
  const sortedByChange = [...coinsToRender].sort((a, b) => 
    b.price_change_percentage_24h - a.price_change_percentage_24h
  );
  
  const topGainers = sortedByChange.slice(0, 3);
  const topLosers = sortedByChange.slice(-3).reverse();
  
  moversList.innerHTML = `
    <h3>Top Gainers</h3>
    ${topGainers.map(coin => `
      <div class="mover-item">
        <span>${coin.name} (${coin.symbol.toUpperCase()})</span>
        <span class="positive">+${coin.price_change_percentage_24h.toFixed(2)}%</span>
      </div>
    `).join('')}
    
    <h3 style="margin-top: 1.5rem;">Top Losers</h3>
    ${topLosers.map(coin => `
      <div class="mover-item">
        <span>${coin.name} (${coin.symbol.toUpperCase()})</span>
        <span class="negative">${coin.price_change_percentage_24h.toFixed(2)}%</span>
      </div>
    `).join('')}
  `;
}
function filterCoins() {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredCoins = coins.filter(coin => 
    coin.name.toLowerCase().includes(searchTerm) || 
    coin.symbol.toLowerCase().includes(searchTerm)
  );
  renderCoins(filteredCoins);
}
function sortCoins() {
  const sortBy = sortSelect.value;
  let sortedCoins = [...coins];
  
  switch(sortBy) {
    case 'price':
      sortedCoins.sort((a, b) => b.current_price - a.current_price);
      break;
    case 'change':
      sortedCoins.sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
      break;
    case 'market_cap':
    default:
      sortedCoins.sort((a, b) => b.market_cap - a.market_cap);
  }
  
  renderCoins(sortedCoins);
}
async function showCoinModal(coin) {
  modalTitle.textContent = `${coin.name} Price History (7 Days)`;
  coinModal.classList.remove('hidden');
  
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=usd&days=7`
    );
    
    if (!response.ok) throw new Error('Failed to fetch price history');
    
    const data = await response.json();
    renderChart(data.prices);
  } catch (error) {
    console.error('Error fetching price history:', error);
    document.getElementById('chart-container').innerHTML = 
      '<p style="text-align:center;color:red;">Failed to load price history</p>';
  }
}

function renderChart(prices) {
  const ctx = document.getElementById('price-chart').getContext('2d');
  if (chart) {
    chart.destroy();
  }
  
  const labels = prices.map(price => {
    const date = new Date(price[0]);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  
  const data = prices.map(price => price[1]);
  
 
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(37, 99, 235, 0.2)');
  gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
  

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Price (USD)',
        data: data,
        borderColor: '#2563eb',
        backgroundColor: gradient,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  
  const formData = new FormData(contactForm);
  const templateParams = {
    from_name: formData.get('name'),
    from_email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message')
  };
  
  try {

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );
    
  
    formMessage.textContent = 'Message sent successfully!';
    formMessage.className = 'success';
    contactForm.reset();
  } catch (error) {
    console.error('EmailJS Error:', error);
    formMessage.textContent = 'Failed to send message. Please try again.';
    formMessage.className = 'error';
  } finally {
   
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Send Message';
    submitBtn.disabled = false;
    
    
    setTimeout(() => {
      formMessage.className = 'hidden';
    }, 5000);
  }
}


if (typeof Chart === 'undefined') {
  window.Chart = class {
    constructor(ctx, config) {
      this.ctx = ctx;
      this.config = config;
      this.render();
    }
    
    render() {
      const { data, options } = this.config;
      const { labels, datasets } = data;
      const { width, height } = this.ctx.canvas;

      this.ctx.clearRect(0, 0, width, height);
      const values = datasets[0].data;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      this.ctx.lineWidth = 1;
      
      
      for (let i = 0; i <= 4; i++) {
        const y = height - (i * height / 4);
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
      }
   
      this.ctx.strokeStyle = datasets[0].borderColor;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      
      labels.forEach((label, i) => {
        const x = (i / (labels.length - 1)) * width;
        const y = height - ((values[i] - min) / range) * height;
        
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      
      this.ctx.stroke();
    
      if (datasets[0].fill) {
        this.ctx.lineTo(width, height);
        this.ctx.lineTo(0, height);
        this.ctx.closePath();
        this.ctx.fillStyle = datasets[0].backgroundColor || 'rgba(37, 99, 235, 0.2)';
        this.ctx.fill();
      }
    }
    
    destroy() {
      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
  };
}