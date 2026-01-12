// js/app.js

// --- 1. RESTAURAÇÃO: CONFIG E CATEGORIAS ---
function carregar_config() {
   var url = CONFIG.SCRIPT_URL + "?rota=config&nocache=" + new Date().getTime();
   var configCache = JSON.parse(localStorage.getItem('loja_config'));
   if(configCache) aplicar_config(configCache);

   fetch(url)
    .then(res => res.json())
    .then(data => {
        if(data.erro) return;
        var config = {};
        if(Array.isArray(data)) {
            data.forEach(l => { if(l.Chave && l.Valor) config[l.Chave] = l.Valor; });
        } else { config = data; }
        localStorage.setItem("loja_config", JSON.stringify(config));
        aplicar_config(config);
    })
    .catch(e => console.log("Erro config", e));
}

function aplicar_config(config) {
    if(config.NomeDoSite) {
        document.title = config.NomeDoSite;
        var logo = document.getElementById('logo_site');
        if(logo) logo.innerText = config.NomeDoSite;
    }
    if(config.CorPrincipal) document.documentElement.style.setProperty('--cor-principal', config.CorPrincipal);
    if(config.LogoDoSite && config.LogoDoSite.trim() !== "") {
        var logo = document.getElementById('logo_site');
        var src = config.LogoDoSite.replace('/view', '/preview');
        logo.innerHTML = `<img src="${src}" style="max-height:40px; margin-right:10px;"> ${config.NomeDoSite}`;
    }
}

function carregar_categorias(produtos) {
    const menu = document.getElementById('categoria_menu');
    if(!menu) return;
    menu.innerHTML = ''; 
    const categorias = [...new Set(produtos.map(p => p.Categoria))].filter(c => c); 
    
    if(categorias.length === 0) menu.innerHTML = '<li><a class="dropdown-item" href="#">Sem categorias</a></li>';
    else {
        categorias.forEach(cat => {
            var li = document.createElement('li');
            li.innerHTML = `<a class="dropdown-item" href="#" onclick="print_productos('Categoria', '${cat}')">${cat}</a>`;
            menu.appendChild(li);
        });
    }
}

// --- 2. LÓGICA DE PRODUTOS E CARRINHO ---
function carregar_produtos() {
  var url = CONFIG.SCRIPT_URL + "?rota=produtos&nocache=" + new Date().getTime();
  fetch(url).then(r => r.json()).then(data => {
     localStorage.setItem("calçados", JSON.stringify(data));
     
     // MUDANÇA 1: Carrega o menu AQUI, com os dados completos
     carregar_categorias(data); 
     
     mostrar_produtos(data);
  });
}

function mostrar_produtos(produtos) {
  const container = document.getElementById('div_produtos');
  container.innerHTML = '';
  
  if(produtos.length === 0) {
      container.innerHTML = '<div class="col-12 text-center mt-5"><p class="text-muted">Nenhum produto encontrado.</p><button class="btn btn-outline-secondary" onclick="limpar_filtros()">Ver Todos</button></div>';
      return;
  }

  produtos.forEach(p => {
    // Adicionei ALT na imagem para Acessibilidade/SEO
    var altText = p.Produto + " - " + p.Categoria; 
    var infoExtra = p.Variacoes ? `<small>Opções disponíveis</small>` : '';
    
    const item = document.createElement('div');
    item.className = 'col-md-3 mt-4';
    item.innerHTML = `
      <div class="card shadow-sm h-100">
          <img class="bd-placeholder-img card-img-top" src="${p.ImagemPrincipal}" alt="${altText}" style="height: 200px; object-fit: cover;"/>
          <div class="card-body d-flex flex-column">
              <p class="card-text">
                  <strong>${p.Produto}</strong><br/>
                  <span class="text-primary fw-bold">R$ ${parseFloat(p.Preço).toFixed(2)}</span><br/>
                  <small class="text-muted">${p.Categoria}</small><br/>
                  ${infoExtra}
              </p>
              <div class="mt-auto btn-group">
                  <button class="btn btn-sm btn-outline-primary" aria-label="Ver detalhes de ${p.Produto}" onclick="abrir_modal_ver('${p.ID}')">Ver Detalhes</button>
                  <button class="btn btn-sm btn-primary" aria-label="Comprar ${p.Produto}" onclick="adicionar_carrinho('${p.ID}','${p.Produto}','${p.Preço}','${p.ImagemPrincipal}')">Comprar</button>
              </div>
          </div>
      </div>`;
    container.appendChild(item);
  });
  
  // MUDANÇA 2: REMOVI A LINHA QUE RECARREGAVA O MENU AQUI
  // carregar_categorias(produtos); <--- NÃO EXISTE MAIS AQUI
}

// Adicione esta função extra no final do arquivo para o botão "Ver Todos" funcionar
function limpar_filtros() {
    var dados = JSON.parse(localStorage.getItem('calçados')) || [];
    mostrar_produtos(dados);
    document.getElementById('txt_search').value = "";
}

function abrir_modal_ver(id) {
    var dados = JSON.parse(localStorage.getItem('calçados')) || [];
    var produto = dados.find(p => p.ID === id);
    if (!produto) return;

    document.getElementById('modalTituloProduto').innerText = produto.Produto;
    document.getElementById('modalPreco').innerText = 'R$ ' + parseFloat(produto.Preço).toFixed(2);
    document.getElementById('modalDescricaoTexto').innerText = produto.Descrição || "";

    var containerImagens = document.getElementById('carouselImagensContainer');
    containerImagens.innerHTML = '';
    var imgs = [produto.ImagemPrincipal];
    if(produto.ImagensExtras) imgs = imgs.concat(produto.ImagensExtras.split(',').map(s=>s.trim()));
    
    imgs.forEach((src, i) => {
        if(src.length > 4) {
            var div = document.createElement('div');
            div.className = i===0 ? 'carousel-item active' : 'carousel-item';
            div.innerHTML = `<img src="${src}" class="d-block w-100" style="margin:0 auto;">`;
            containerImagens.appendChild(div);
        }
    });

    document.getElementById('btnAdicionarModal').onclick = function() {
        adicionar_carrinho(produto.ID, produto.Produto, produto.Preço, produto.ImagemPrincipal);
        bootstrap.Modal.getInstance(document.getElementById('modalProduto')).hide();
    };

    new bootstrap.Modal(document.getElementById('modalProduto')).show();
}

function adicionar_carrinho(id, prod, preco, img) {
    var c = JSON.parse(localStorage.getItem('carrinho')) || [];
    var existe = c.find(i => i.id === id);
    if(existe) existe.quantidade++; else c.push({id, producto:prod, preco, imagem:img, quantidade:1});
    localStorage.setItem('carrinho', JSON.stringify(c));
    atualizar_carrinho();
}
function remover_carrinho(id) {
    var c = JSON.parse(localStorage.getItem('carrinho'));
    c.splice(c.findIndex(i => i.id === id), 1);
    localStorage.setItem('carrinho', JSON.stringify(c));
    atualizar_carrinho();
}
function atualizar_carrinho() {
    var c = JSON.parse(localStorage.getItem('carrinho')) || [];
    var div = document.getElementById('div_carrito');
    div.innerHTML = '';
    var total = 0;
    c.forEach(i => {
        var row = document.createElement('div');
        row.className = 'd-flex justify-content-between mb-2';
        row.innerHTML = `<span>${i.producto} (${i.quantidade})</span><span>R$ ${(i.preco*i.quantidade).toFixed(2)} <button class="btn btn-sm btn-danger" onclick="remover_carrinho('${i.id}')">x</button></span>`;
        div.appendChild(row);
        total += i.preco * i.quantidade;
    });
    document.getElementById('total_carro').innerText = 'R$ ' + total.toFixed(2);
}

function print_productos(tipo, valor) {
    var dados = JSON.parse(localStorage.getItem('calçados')) || [];
    var filtro = dados;
    if(tipo === 'Categoria') filtro = dados.filter(p => p.Categoria === valor);
    if(tipo === 'Pesquisa') filtro = dados.filter(p => p.Produto.toLowerCase().includes(valor.toLowerCase()));
    mostrar_produtos(filtro);
}

// --- 3. PAGAMENTO E VIACEP ---
function pesquisarCep(valor) {
    var cep = valor.replace(/\D/g, '');
    if (cep != "") {
        var script = document.createElement('script');
        script.src = 'https://viacep.com.br/ws/'+ cep + '/json/?callback=meu_callback_cep';
        document.body.appendChild(script);
    }
}
function meu_callback_cep(conteudo) {
    if (!("erro" in conteudo)) {
        document.getElementById('checkout_rua').value=(conteudo.logradouro);
        document.getElementById('checkout_bairro').value=(conteudo.bairro);
        document.getElementById('checkout_cidade').value=(conteudo.localidade);
        document.getElementById('checkout_uf').value=(conteudo.uf);
        document.getElementById('checkout_numero').focus();
    } else { alert("CEP não encontrado."); }
}

function iniciarPagamento() {
    var cliente = {
        cpf: document.getElementById('checkout_cpf').value,
        telefone: document.getElementById('checkout_telefone').value,
        cep: document.getElementById('checkout_cep').value,
        rua: document.getElementById('checkout_rua').value,
        numero: document.getElementById('checkout_numero').value,
        bairro: document.getElementById('checkout_bairro').value,
        cidade: document.getElementById('checkout_cidade').value,
        uf: document.getElementById('checkout_uf').value,
        complemento: document.getElementById('checkout_complemento').value
    };
    if (!cliente.cpf || !cliente.rua || !cliente.numero) {
        alert("Preencha CPF, Rua e Número."); return;
    }
    
    var carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    if (carrinho.length === 0) { alert("Carrinho vazio!"); return; }

    var btn = event.target;
    btn.innerText = "Processando...";
    btn.disabled = true;

    var items = carrinho.map(i => ({title: i.producto, quantity: i.quantidade, currency_id: 'BRL', unit_price: parseFloat(i.preco)}));
    
    fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({cliente: cliente, items: items})
    })
    .then(r => r.text())
    .then(link => { window.location.href = link; })
    .catch(e => { console.error(e); alert("Erro ao processar."); btn.innerText = "Tentar Novamente"; btn.disabled = false; });
}

$(document).ready(function() {
    carregar_config();
    carregar_produtos();
    atualizar_carrinho();
});
