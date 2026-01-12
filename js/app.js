// js/app.js - Versão E-commerce Completo (Frete, Variações, Quantidade)

// --- 1. CONFIGURAÇÕES INICIAIS ---
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
    if(config.CorPrincipal) document.documentElement.style.setProperty('--cor-principal', config.CorPrincipal);
    var titulo = config.TituloAba || config.NomeDoSite;
    if(titulo) {
        document.title = titulo;
        var seoTitle = document.getElementById('seo_titulo');
        if(seoTitle) seoTitle.innerText = titulo;
    }
    if(config.DescricaoSEO) {
        var metaDesc = document.getElementById('seo_descricao');
        if(metaDesc) metaDesc.setAttribute("content", config.DescricaoSEO);
    }
    // Logo
    var logo = document.getElementById('logo_site');
    if(logo) {
        if(config.LogoDoSite && config.LogoDoSite.trim() !== "") {
            var src = config.LogoDoSite.replace('/view', '/preview');
            logo.innerHTML = `<img src="${src}" alt="${config.NomeDoSite}" style="max-height:40px; margin-right:10px;">`;
        } else if (config.NomeDoSite) { logo.innerText = config.NomeDoSite; }
    }
}

// --- 2. MENU E CATEGORIAS ---
function carregar_categorias(produtos) {
    const menu = document.getElementById('categoria_menu');
    if(!menu) return;
    
    menu.innerHTML = `<li><a class="dropdown-item fw-bold" href="#" onclick="limpar_filtros(); fechar_menu_mobile()">Ver Todos</a></li>`;
    menu.innerHTML += `<li><hr class="dropdown-divider"></li>`;
    
    const categorias = [...new Set(produtos.map(p => p.Categoria))].filter(c => c); 
    
    if(categorias.length > 0) {
        categorias.forEach(cat => {
            var li = document.createElement('li');
            li.innerHTML = `<a class="dropdown-item" href="#" onclick="print_productos('Categoria', '${cat}'); fechar_menu_mobile()">${cat}</a>`;
            menu.appendChild(li);
        });
    }
}

function fechar_menu_mobile() {
    var navMain = document.getElementById("navbarCollapse");
    if (navMain.classList.contains('show')) {
        document.querySelector('.navbar-toggler').click();
    }
}

// --- 3. PRODUTOS E LOADING ---
function carregar_produtos() {
  mostrar_skeleton(true);
  
  var url = CONFIG.SCRIPT_URL + "?rota=produtos&nocache=" + new Date().getTime();
  fetch(url).then(r => r.json()).then(data => {
     mostrar_skeleton(false); 
     localStorage.setItem("calçados", JSON.stringify(data));
     carregar_categorias(data); 
     mostrar_produtos(data);
  });
}

function mostrar_skeleton(exibir) {
    const container = document.getElementById('loading_skeleton_container');
    const boxes = document.getElementById('loading_skeleton_boxes');
    if(!container) return;
    
    if(exibir) {
        boxes.innerHTML = '';
        for(let i=0; i<4; i++) {
            boxes.innerHTML += `
            <div class="col-md-3 col-6"> 
                <div class="card shadow-sm h-100 border-0">
                    <div class="card-img-top bg-secondary" style="height: 150px; opacity:0.1; animation: pulse 1.5s infinite;"></div>
                    <div class="card-body">
                        <h5 class="card-title placeholder-glow"><span class="placeholder col-6"></span></h5>
                    </div>
                </div>
            </div>`;
        }
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function mostrar_produtos(produtos) {
  const container = document.getElementById('div_produtos');
  container.innerHTML = '';
  
  if(produtos.length === 0) {
      container.innerHTML = '<div class="col-12 text-center mt-5"><p class="text-muted">Nenhum produto encontrado.</p><button class="btn btn-outline-secondary" onclick="limpar_filtros()">Ver Todos</button></div>';
      return;
  }

  produtos.forEach(p => {
    var altText = p.Produto + " - " + p.Categoria; 
    var infoExtra = (p.Tamanhos || p.Variacoes) ? `<small>Opções disponíveis</small>` : '';
    
    const item = document.createElement('div');
    item.className = 'col-md-3 col-12 mt-4'; 
    item.innerHTML = `
      <div class="card shadow-sm h-100">
          <div style="height: 250px; display: flex; align-items: center; justify-content: center; background: #fff;">
             <img src="${p.ImagemPrincipal}" alt="${altText}" loading="lazy" style="max-height: 100%; max-width: 100%; object-fit: contain; padding: 10px;"/>
          </div>
          <div class="card-body d-flex flex-column">
              <p class="card-text">
                  <strong>${p.Produto}</strong><br/>
                  <span class="text-primary fw-bold" style="font-size: 1.2rem;">R$ ${parseFloat(p.Preço).toFixed(2)}</span><br/>
                  <small class="text-muted">${p.Categoria}</small><br/>
                  ${infoExtra}
              </p>
              <div class="mt-auto btn-group w-100">
                  <button class="btn btn-primary w-100" onclick="abrir_modal_ver('${p.ID}')">Ver Detalhes</button>
              </div>
          </div>
      </div>`;
    container.appendChild(item);
  });
}

function limpar_filtros() {
    var dados = JSON.parse(localStorage.getItem('calçados')) || [];
    mostrar_produtos(dados);
    document.getElementById('txt_search').value = "";
}

// --- 4. MODAL DO PRODUTO (VARIAÇÕES, FRETE, MEDIDAS) ---
var produtoAtual = null; // Variável global para guardar o produto aberto no modal
var variacaoSelecionada = null;

function abrir_modal_ver(id) {
    var dados = JSON.parse(localStorage.getItem('calçados')) || [];
    produtoAtual = dados.find(p => p.ID === id);
    if (!produtoAtual) return;

    variacaoSelecionada = null; // Reseta seleção

    // 1. Dados Básicos
    document.getElementById('modalTituloProduto').innerText = produtoAtual.Produto;
    document.getElementById('modalPreco').innerText = 'R$ ' + parseFloat(produtoAtual.Preço).toFixed(2);
    document.getElementById('modalDescricaoTexto').innerText = produtoAtual.Descrição || "";

    // 2. Fotos (Carrossel)
    var containerImagens = document.getElementById('carouselImagensContainer');
    containerImagens.innerHTML = '';
    var imgs = [produtoAtual.ImagemPrincipal];
    if(produtoAtual.ImagensExtras) imgs = imgs.concat(produtoAtual.ImagensExtras.split(',').map(s=>s.trim()));
    
    imgs.forEach((src, i) => {
        if(src.length > 4) {
            var div = document.createElement('div');
            div.className = i===0 ? 'carousel-item active' : 'carousel-item';
            div.innerHTML = `<img src="${src}" class="d-block w-100" style="height: 300px; object-fit: contain; background: #f8f9fa;">`;
            containerImagens.appendChild(div);
        }
    });

    // 3. Variações (Tamanhos)
    var divVar = document.getElementById('areaVariacoes');
    var listaVar = document.getElementById('listaVariacoes');
    divVar.style.display = 'none';
    listaVar.innerHTML = '';

    if (produtoAtual.Tamanhos && produtoAtual.Tamanhos.trim() !== "") {
        divVar.style.display = 'block';
        var tamanhos = produtoAtual.Tamanhos.split(',').map(t => t.trim());
        tamanhos.forEach(tam => {
            // Cria botões de rádio estilizados
            var idBtn = 'var_' + tam;
            listaVar.innerHTML += `
                <input type="radio" class="btn-check" name="variacao" id="${idBtn}" autocomplete="off" onchange="selecionar_variacao('${tam}')">
                <label class="btn btn-outline-secondary" for="${idBtn}">${tam}</label>
            `;
        });
    } else {
        variacaoSelecionada = "Único"; // Se não tem variação, define como único
    }

    // 4. Tabela de Medidas
    var divMedidas = document.getElementById('areaTabelaMedidas');
    if (produtoAtual.TamanhosImagens && produtoAtual.TamanhosImagens.trim() !== "") {
        divMedidas.style.display = 'block';
        document.getElementById('imgTabelaMedidas').src = produtoAtual.TamanhosImagens;
    } else {
        divMedidas.style.display = 'none';
    }

    // 5. Configurar Botões
    document.getElementById('btnAdicionarModal').onclick = function() {
        if (!variacaoSelecionada) {
            alert("Por favor, selecione uma opção (Tamanho/Variação).");
            return;
        }
        var nomeFinal = produtoAtual.Produto + (variacaoSelecionada !== "Único" ? ` - ${variacaoSelecionada}` : "");
        adicionar_carrinho(produtoAtual.ID + "_" + variacaoSelecionada, nomeFinal, produtoAtual.Preço, produtoAtual.ImagemPrincipal);
        bootstrap.Modal.getInstance(document.getElementById('modalProduto')).hide();
    };

    // 6. Configurar Simulador de Frete
    document.getElementById('resultadoFrete').innerHTML = "";
    document.getElementById('inputSimulaCep').value = "";
    document.getElementById('btnSimularFrete').onclick = function() {
        simular_frete(produtoAtual);
    };

    new bootstrap.Modal(document.getElementById('modalProduto')).show();
}

function selecionar_variacao(valor) {
    variacaoSelecionada = valor;
}

// --- 5. LÓGICA DE FRETE (SIMULAÇÃO) ---
function simular_frete(produto) {
    var cep = document.getElementById('inputSimulaCep').value.replace(/\D/g, '');
    if (cep.length !== 8) { alert("CEP inválido"); return; }
    
    var btn = document.getElementById('btnSimularFrete');
    var res = document.getElementById('resultadoFrete');
    
    btn.innerText = "...";
    btn.disabled = true;
    res.innerHTML = "Calculando...";
    
    // Dados para o SuperFrete
    var dadosFrete = {
        op: "calcular_frete", // ROTA DO BACKEND
        cep: cep,
        peso: produto.Peso || 0.3,
        comprimento: produto.Comprimento || 20,
        altura: produto.Altura || 10,
        largura: produto.Largura || 15
    };
    
    // ATENÇÃO: Envia POST para o seu Google Apps Script
    fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(dadosFrete) // Envia como String JSON no corpo
    })
    .then(r => r.json())
    .then(data => {
        btn.innerText = "Calcular";
        btn.disabled = false;
        
        if (data.erro) {
            res.innerHTML = `<span class="text-danger">${data.erro}</span>`;
        } else if (data.opcoes) {
            var html = '<ul class="list-group mt-2">';
            data.opcoes.forEach(op => {
               html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                  ${op.nome} (${op.prazo} dias)
                  <span class="badge bg-primary rounded-pill">R$ ${op.valor}</span>
               </li>`;
            });
            html += '</ul>';
            res.innerHTML = html;
        } else {
            res.innerHTML = "Sem opções disponíveis.";
        }
    })
    .catch(e => {
        console.error(e);
        btn.innerText = "Calcular";
        btn.disabled = false;
        res.innerHTML = "Erro ao calcular.";
    });
}


// --- 6. CARRINHO (QUANTIDADE E +/-) ---
function adicionar_carrinho(id, prod, preco, img) {
    var c = JSON.parse(localStorage.getItem('carrinho')) || [];
    var existe = c.find(i => i.id === id);
    if(existe) existe.quantidade++; else c.push({id, producto:prod, preco, imagem:img, quantidade:1});
    localStorage.setItem('carrinho', JSON.stringify(c));
    atualizar_carrinho();
}

function mudar_quantidade(id, delta) {
    var c = JSON.parse(localStorage.getItem('carrinho')) || [];
    var item = c.find(i => i.id === id);
    if(item) {
        item.quantidade += delta;
        if(item.quantidade <= 0) {
            // Remove se chegar a 0
            c.splice(c.findIndex(i => i.id === id), 1);
        }
        localStorage.setItem('carrinho', JSON.stringify(c));
        atualizar_carrinho();
    }
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
    
    if(c.length === 0) {
        div.innerHTML = '<p class="text-center text-muted">Seu carrinho está vazio.</p>';
    }

    c.forEach(i => {
        var row = document.createElement('div');
        row.className = 'd-flex justify-content-between align-items-center mb-3 border-bottom pb-2';
        row.innerHTML = `
        <div class="d-flex align-items-center" style="width: 50%;">
            <img src="${i.imagem}" style="width:50px; height:50px; object-fit:cover; margin-right:10px; border-radius:5px;">
            <div>
                <div style="font-size:0.85rem; font-weight:bold; line-height: 1.2;">${i.producto}</div>
                <div style="font-size:0.8rem; color:#666;">Unit: R$ ${parseFloat(i.preco).toFixed(2)}</div>
            </div>
        </div>
        
        <div class="d-flex align-items-center">
            <button class="btn btn-sm btn-outline-secondary px-2" onclick="mudar_quantidade('${i.id}', -1)">-</button>
            <span class="mx-2 font-weight-bold">${i.quantidade}</span>
            <button class="btn btn-sm btn-outline-secondary px-2" onclick="mudar_quantidade('${i.id}', 1)">+</button>
        </div>

        <div class="text-end" style="width: 20%;">
             <div style="font-weight:bold; font-size: 0.9rem;">R$ ${(i.preco*i.quantidade).toFixed(2)}</div>
        </div>`;
        div.appendChild(row);
        total += i.preco * i.quantidade;
    });
    
    document.getElementById('total_carro').innerText = 'R$ ' + total.toFixed(2);
    
    var btnTotal = document.getElementById('valorTotal');
    if(btnTotal) btnTotal.innerText = 'R$ ' + total.toFixed(2);
}

function print_productos(tipo, valor) {
    var dados = JSON.parse(localStorage.getItem('calçados')) || [];
    var filtro = dados;
    if(tipo === 'Categoria') filtro = dados.filter(p => p.Categoria === valor);
    if(tipo === 'Pesquisa') filtro = dados.filter(p => p.Produto.toLowerCase().includes(valor.toLowerCase()));
    mostrar_produtos(filtro);
}

// --- 7. CHECKOUT E CEP ---
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

// Animação CSS para o Skeleton
var style = document.createElement('style');
style.innerHTML = `@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }`;
document.head.appendChild(style);

$(document).ready(function() {
    carregar_config();
    carregar_produtos();
    atualizar_carrinho();

    // UX: Sumir Carrinho quando abrir Modal
    var modalProduto = document.getElementById('modalProduto');
    if(modalProduto) {
        modalProduto.addEventListener('show.bs.modal', function () {
            document.getElementById('btn_carrinho_flutuante').style.display = 'none';
        });
        modalProduto.addEventListener('hidden.bs.modal', function () {
            document.getElementById('btn_carrinho_flutuante').style.display = 'block';
        });
    }
});
