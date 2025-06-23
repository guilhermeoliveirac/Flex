// script.js

document.addEventListener('DOMContentLoaded', () => {
  verificarAutenticacao();
  setupFormConsumo();
  setupLogout();

  if (document.getElementById('home')) carregarDashboard();
  if (document.getElementById('valores')) carregarTabela();
});

function verificarAutenticacao() {
  const logado = localStorage.getItem('logado');
  const isLoginPage = window.location.pathname.includes('login.html');
  if (!logado && !isLoginPage) {
    window.location.href = 'login.html';
  }
}

function setupFormConsumo() {
  const form = document.getElementById('formConsumo');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dados = {
      data: form.data.value,
      km: parseFloat(form.km.value),
      litros: parseFloat(form.litros.value),
      valor: parseFloat(form.valor.value),
      combustivel: form.combustivel.value
    };

    fetch('/adicionar-consumo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          alert('Consumo registrado com sucesso!');
          form.reset();
        } else {
          alert('Erro ao registrar consumo.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Erro de rede ao registrar consumo.');
      });
  });
}

function setupLogout() {
  const btnLogout = document.getElementById('btnLogout');
  if (!btnLogout) return;
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('logado');
    window.location.href = 'login.html';
  });
}

// --- Login page handling ---
const formLogin = document.getElementById('loginForm');
if (formLogin) {
  formLogin.addEventListener('submit', e => {
    e.preventDefault();
    const usuario = document.getElementById('uname').value;
    const senha = document.getElementById('psw').value;

    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          localStorage.setItem('logado', 'true');
          window.location.href = 'index.html';
        } else {
          const msg = document.getElementById('mensagemLogin');
          msg.textContent = json.message || 'Usuário ou senha inválidos.';
          msg.style.color = 'red';
        }
      })
      .catch(err => {
        console.error(err);
        alert('Erro de conexão ao efetuar login.');
      });
  });
}

// --- Dashboard (home) ---
function carregarDashboard() {
  fetch('/consumo')
    .then(res => res.json())
    .then(lista => {
      const selAno = document.getElementById('filtroAnoHome');
      const selMes = document.getElementById('filtroMesHome');
      selAno.innerHTML = '<option value="">Todos</option>';
      selMes.value = '';

      const anos = [...new Set(lista.map(i => new Date(i.data).getFullYear()))].sort();
      anos.forEach(ano => {
        const o = document.createElement('option'); o.value = ano; o.textContent = ano;
        selAno.appendChild(o);
      });

      selAno.addEventListener('change', () => atualizarDashboard(lista, selAno.value, selMes.value));
      selMes.addEventListener('change', () => atualizarDashboard(lista, selAno.value, selMes.value));

      atualizarDashboard(lista, selAno.value, selMes.value);
    });
}

function atualizarDashboard(lista, ano, mes) {
  const filtrados = lista.filter(item => {
    const d = new Date(item.data);
    return (!ano || d.getFullYear() == ano) && (mes === '' || d.getMonth() == parseInt(mes));
  });

  // Média simples
  let somaMedias = 0, count = 0;
  filtrados.forEach(it => {
    if (it.litros > 0) { somaMedias += it.km / it.litros; count++; }
  });
  const mediaSimples = count ? (somaMedias / count).toFixed(2) : '-';
  document.getElementById('media-consumo').textContent = `Média de Consumo: ${mediaSimples} km/l`;

  // Custo por km global
  let totalValor = 0, firstKm = null, lastKm = null;
  filtrados.forEach(it => {
    totalValor += it.valor;
    firstKm = firstKm === null ? it.km : Math.min(firstKm, it.km);
    lastKm  = lastKm  === null ? it.km : Math.max(lastKm , it.km);
  });
  const totalKm = (firstKm !== null && lastKm !== null && lastKm > firstKm) ? lastKm - firstKm : 0;
  const custoKm = totalKm ? `R$ ${(totalValor / totalKm).toFixed(2)}` : '-';
  document.getElementById('custo-km').textContent = `Custo por km: ${custoKm}`;

  // Gráfico
  const ctx = document.getElementById('graficoConsumo').getContext('2d');
  if (window.chartConsumo) window.chartConsumo.destroy();

  let labels, dataPoints, labelGraf;
  if (ano && mes !== '') {
    const dias = filtrados.map(i => ({ dia: new Date(i.data).getDate(), valor: i.valor }))
                      .sort((a,b) => a.dia - b.dia);
    labels = dias.map(x => `Dia ${x.dia}`);
    dataPoints = dias.map(x => x.valor);
    labelGraf = 'Gasto por Dia (R$)';
  } else {
    const gMes = Array(12).fill(0);
    filtrados.forEach(i => gMes[new Date(i.data).getMonth()] += i.valor);
    labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    dataPoints = gMes;
    labelGraf = 'Gasto por Mês (R$)';
  }

  window.chartConsumo = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: labelGraf, data: dataPoints }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// --- Histórico (valores) ---
function carregarTabela() {
  fetch('/consumo')
    .then(res => res.json())
    .then(lista => {
      const selAno = document.getElementById('filtroAnoHome');
      const selMes = document.getElementById('filtroMesValores');
      selAno.innerHTML = '<option value="">Todos</option>';

      [...new Set(lista.map(i => new Date(i.data).getFullYear()))]
        .sort().forEach(ano => {
          const o = document.createElement('option'); o.value = ano; o.textContent = ano;
          selAno.appendChild(o);
        });

      selAno.addEventListener('change', () => carregarTabelaFiltrada(lista, selAno.value, selMes.value));
      selMes.addEventListener('change', () => carregarTabelaFiltrada(lista, selAno.value, selMes.value));

      carregarTabelaFiltrada(lista, selAno.value, selMes.value);
    });
}

function carregarTabelaFiltrada(lista, ano, mes) {
  const tbody = document.querySelector('#tabela-valores tbody');
  tbody.innerHTML = '';

  lista.filter(i => {
    const d = new Date(i.data);
    return (!ano || d.getFullYear() == ano) && (mes === '' || d.getMonth() == parseInt(mes));
  }).forEach(item => {
    const row = tbody.insertRow();
    row.insertCell().textContent = new Date(item.data).toLocaleDateString();
    row.insertCell().textContent = item.km;
    row.insertCell().textContent = item.litros;
    row.insertCell().textContent = `R$ ${item.valor.toFixed(2)}`;
    row.insertCell().textContent = item.combustivel;

    const media = item.litros > 0 ? `${(item.km / item.litros).toFixed(2)} km/l` : '-';
    row.insertCell().textContent = media;

    const actionCell = row.insertCell();
    const btn = document.createElement('button');
    btn.textContent = 'Excluir';
    btn.onclick = () => {
      if (confirm(`Excluir registro de ${new Date(item.data).toLocaleDateString()}?`)) {
        excluirItem(item.id);
      }
    };
    actionCell.appendChild(btn);
  });
}

function excluirItem(id) {
  fetch(`/consumo/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(json => {
      if (json.success) cargarTabela();
      else alert('Erro ao excluir item.');
    })
    .catch(err => { console.error(err); alert('Erro de rede ao excluir item.'); });
}
