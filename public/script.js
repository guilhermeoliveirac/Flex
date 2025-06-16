document.addEventListener('DOMContentLoaded', () => {
  verificarAutenticacao();
  const form = document.getElementById('formConsumo');
  if (form) {
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
      })
        .then(res => {
          if (!res.ok) throw new Error('Erro no servidor');
          return res.json();
        })
        .then(data => {
          if (data.success) {
            alert('Consumo registrado com sucesso!');
            form.reset();
          } else {
            alert('Erro ao registrar.');
          }
        })
        .catch(err => {
          console.error('Erro ao salvar:', err);
          alert('Erro de rede: ' + err.message);
        });
    });
  }

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', () => {
    localStorage.removeItem('logado');
    window.location.href = 'login.html';
  });

  if (document.getElementById('home')) carregarDashboard();
  if (document.getElementById('valores')) carregarTabela();
});

function verificarAutenticacao() {
  const logado = localStorage.getItem('logado');
  if (!logado && window.location.pathname.includes('index.html')) {
    window.location.href = 'login.html';
  }
}
const formLogin = document.getElementById('loginForm');
if (formLogin) {
  formLogin.addEventListener('submit', e => {
    e.preventDefault();
    const usuario = document.getElementById('uname').value;
    const senha = document.getElementById('psw').value;

    fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ usuario, senha })
    })
    .then(res => res.json())
    .then(data => {
      const msg = document.getElementById('mensagemLogin');
      if (data.success) {
        localStorage.setItem('logado', 'true');
        window.location.href = 'index.html';
      } else {
        msg.textContent = data.message || 'Usuário ou senha inválidos.';
        msg.style.color = 'red';
      }
    })
    .catch(err => {
      console.error('Erro ao fazer login:', err);
      alert('Erro de conexão com o servidor.');
    });
  });
}


function carregarDashboard() {
  fetch('/consumo')
    .then(res => res.json())
    .then(lista => {
      const selectAno = document.getElementById('filtroAnoHome');
      const selectMes = document.getElementById('filtroMesHome');

      const anos = [...new Set(lista.map(i => new Date(i.data).getFullYear()))].sort();
      anos.forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        selectAno.appendChild(option);
      });

      selectAno.addEventListener('change', () => atualizarDashboard(lista, selectAno.value, selectMes.value));
      selectMes.addEventListener('change', () => atualizarDashboard(lista, selectAno.value, selectMes.value));
      atualizarDashboard(lista, selectAno.value, selectMes.value);
    });
}

function atualizarDashboard(lista, ano, mes) {
  const filtrados = lista.filter(i => {
    const data = new Date(i.data);
    return (!ano || data.getFullYear() == ano) &&
      (mes === '' || data.getMonth() == parseInt(mes));
  });

  const dadosPorMes = Array(12).fill(0);
  const gastoPorAno = {};

  let totalLitros = 0, totalKm = 0, totalValor = 0, ultimoKm = 0, primeiroKm = null;

  lista.forEach(item => {
    const data = new Date(item.data);
    const anoItem = data.getFullYear();
    gastoPorAno[anoItem] = (gastoPorAno[anoItem] || 0) + item.valor;
    dadosPorMes[data.getMonth()] += item.valor;
  });

  filtrados.forEach(item => {
    if (!isNaN(item.litros) && !isNaN(item.km) && !isNaN(item.valor)) {
      const data = new Date(item.data);
      totalLitros += item.litros;
      totalValor += item.valor;
      if (primeiroKm === null || item.km < primeiroKm) primeiroKm = item.km;
      if (item.km > ultimoKm) ultimoKm = item.km;
    }
  });

  totalKm = (primeiroKm !== null && ultimoKm > primeiroKm)
    ? (ultimoKm - primeiroKm)
    : 0;


  totalKm = ultimoKm - primeiroKm;
  document.getElementById('media-consumo').textContent =
    `Média de Consumo: ${totalKm > 0 ? (totalKm / totalLitros).toFixed(2) : '-'} km/l`;
  document.getElementById('custo-km').textContent =
    `Custo por km: ${totalKm > 0 ? 'R$ ' + (totalValor / totalKm).toFixed(2) : '-'}`;

  const ctx = document.getElementById('graficoConsumo').getContext('2d');
  if (window.chartConsumo) window.chartConsumo.destroy();
  let labels = [], dados = [], label = '';

  if (mes !== '' && ano) {
    // Gráfico por dia
    const diasDoMes = filtrados.map(item => {
      const data = new Date(item.data);
      return {
        dia: data.getDate().toString().padStart(2, '0') + '/' + (data.getMonth() + 1).toString().padStart(2, '0'),
        valor: item.valor
      };
    });

    diasDoMes.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));

    labels = diasDoMes.map(i => i.dia);
    dados = diasDoMes.map(i => i.valor);
    label = 'Gasto por Dia (R$)';
  } else {
    labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    dados = dadosPorMes;
    label = 'Gasto por Mês (R$)';
  }

  window.chartConsumo = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: dados,
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });


  const anoMaiorGasto = Object.entries(gastoPorAno).sort((a, b) => b[1] - a[1])[0];
  if (anoMaiorGasto) {
    let p = document.getElementById('ano-maior-gasto');
    if (!p) {
      p = document.createElement('p');
      p.id = 'ano-maior-gasto';
      document.querySelector('main').appendChild(p);
    }
    p.textContent = `Ano com maior gasto: ${anoMaiorGasto[0]} (R$ ${anoMaiorGasto[1].toFixed(2)})`;
  }
}

function carregarTabela() {
  fetch('/consumo')
    .then(res => res.json())
    .then(lista => {
      const tbody = document.querySelector('#tabela-valores tbody');
      tbody.innerHTML = '';
      lista.forEach(item => {
        const row = tbody.insertRow();
        row.insertCell().textContent = new Date(item.data).toLocaleDateString();
        row.insertCell().textContent = item.km;
        row.insertCell().textContent = item.litros;
        row.insertCell().textContent = `R$ ${item.valor.toFixed(2)}`;
        row.insertCell().textContent = item.combustivel;
      });

      const selectAno = document.getElementById('filtroAnoHome');
      const anos = [...new Set(lista.map(i => new Date(i.data).getFullYear()))].sort();
      anos.forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        selectAno.appendChild(option);
      });
      const selectMes = document.getElementById('filtroMesValores');
      selectAno.addEventListener('change', () => carregarTabelaFiltrada(lista, selectAno.value, selectMes.value));
      selectMes.addEventListener('change', () => carregarTabelaFiltrada(lista, selectAno.value, selectMes.value));
      carregarTabelaFiltrada(lista, selectAno.value, selectMes.value);

    });
}

function carregarTabelaFiltrada(lista, ano, mes) {
  const tbody = document.querySelector('#tabela-valores tbody');
  tbody.innerHTML = '';
  const filtrados = lista.filter(i => {
    const data = new Date(i.data);
    return data.getFullYear() == ano &&
           (mes === '' || data.getMonth() == parseInt(mes));
  });
  filtrados.forEach(item => {
    const row = tbody.insertRow();
    row.insertCell().textContent = new Date(item.data).toLocaleDateString();
    row.insertCell().textContent = item.km;
    row.insertCell().textContent = item.litros;
    row.insertCell().textContent = `R$ ${item.valor.toFixed(2)}`;
    row.insertCell().textContent = item.combustivel;
  
    const btnCell = row.insertCell();
    const btn = document.createElement('button');
    btn.textContent = 'Excluir';
    btn.style.color = 'white';
    btn.style.backgroundColor = 'red';
    btn.style.border = 'none';
    btn.style.padding = '5px 10px';
    btn.style.cursor = 'pointer';
  
    btn.addEventListener('click', () => {
      if (confirm(`Deseja realmente excluir o registro do dia ${new Date(item.data).toLocaleDateString()}?`)) {
        excluirItem(item.id, ano, mes);
      }
    });
  
    btnCell.appendChild(btn);
  });
  
  
}

function excluirItem(id, ano, mes) {
  fetch(`/consumo/${id}`, {
    method: 'DELETE'
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert('Item excluído com sucesso!');
      carregarTabela(); 
    } else {
      alert('Erro ao excluir item.');
    }
  })
  .catch(err => {
    console.error('Erro ao excluir:', err);
    alert('Erro ao conectar com o servidor.');
  });
}

