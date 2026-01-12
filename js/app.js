// js/app.js - Versão com Frete Real (Soma Pesos), Edição e Máscara CEP

// Variável global para guardar as configurações da planilha
var CONFIG_LOJA = {};

// --- 0. MÁSCARA DE CEP ---
function mascaraCep(t) {
    let v = t.value.replace(/\D/g,"");
    if (v.length > 5) v = v.substring(0,5) + "-" + v.substring(5, 8);
    t.value = v;
}

// --- 1. CONFIGURAÇÕES INICIAIS (AJUSTE CIRÚRGICO AQUI) ---
function carregar_config() {
   var url = CONFIG.SCRIPT_URL + "?rota=config&nocache=" + new Date().getTime();
   
   // Primeiro: Tenta carregar do Cache para ser instantâneo
   var configCache = JSON.parse(localStorage.getItem('loja_config'));
   if(configCache) {
       CONFIG_LOJA = configCache;
       aplicar_config();
   }

   // Segundo: Busca na planilha e ATUALIZA o cache e a tela
   fetch(url)
    .then(res => res.json())
    .then(data => {
        if(data.erro) return;
        var config = {};
        if(Array.isArray(data)) {
            data.forEach(l => { if(l.Chave && l.Valor) config[l.Chave] = l.Valor; });
        } else { config = data; }
        
        localStorage.setItem("loja_config", JSON.stringify(config));
        CONFIG_LOJA = config;
        aplicar_config();
        
        // DISPARO OBRIGATÓRIO: Carrega os produtos após ter a configuração
        carregar_produtos();
    })
    .catch(e => {
        console.log("Erro config", e);
        // Se a internet falhar, tenta carregar produtos mesmo assim
        carregar_produtos();
    });
}

function aplicar_config() {
    if(CONFIG_LOJA.CorPrincipal) document.documentElement.style.setProperty('--cor-principal', CONFIG_LOJA.CorPrincipal);
    
    var titulo = CONFIG_LOJA.TituloAba || CONFIG_LOJA.NomeDoSite;
    if(titulo) {
        document.title = titulo;
        var seoTitle = document.getElementById('seo_titulo');
        if(seoTitle) seoTitle.innerText = titulo;
    }
    
    if(CONFIG_LOJA.DescricaoSEO) {
        var metaDesc = document.getElementById('seo_descricao');
        if(metaDesc) metaDesc.setAttribute("content", CONFIG_LOJA.DescricaoSEO);
    }
    
    var logo = document.getElementById('logo_site');
    if(logo) {
        if(CONFIG_LOJA.LogoDoSite && CONFIG_LOJA.LogoDoSite.trim() !== "") {
            var src = CONFIG_LOJA.LogoDoSite.replace('/view', '/preview');
            logo.innerHTML = `<img src="${src}" alt="${CONFIG_LOJA.NomeDoSite}" style="max-height:40px; margin-right:10px;">`;
        } else if (CONFIG_LOJA.NomeDoSite) { logo.innerText = CONFIG_LOJA.NomeDoSite; }
    }
}

// --- 2. MENU E CATEGORIAS ---
function carregar_categorias(produtos) {
    const menu = document.getElementById('categoria_menu');
    if(!menu) return;
    menu.innerHTML = `<li><a class="dropdown-item fw-bold" href="#" onclick="limpar_filtros(); fechar_menu_mobile()">Ver Todos</a></li>`;
    menu.innerHTML += `<li><hr class="dropdown-divider"></li>`;
    
    if (CONFIG_LOJA.MostrarCategorias === "FALSE") return;

    const categorias = [...new Set(produtos.map(p => p.Categoria))].filter(c => c); 
    if(categorias.length > 0) {
        categorias.forEach(cat => {
            var li = document.createElement('li');
            li.innerHTML = `<a class="dropdown-item" href="#" onclick="mostrar_produtos_por_categoria('${cat}'); fechar_menu_mobile()">${cat}</a>`;
            menu.appendChild(li);
        });
    }
}

function mostrar_produtos_por_categoria(cat) {
    var dados = JSON.parse(localStorage.getItem('calçados')) || [];
    var filtrados = dados.filter(p => p.Categoria === cat);
    mostrar_produtos(filtrados);
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
    
    var colClass = 'col-md-3';
    if(CONFIG_LOJA.ColunasDesktop == 3) colClass = 'col-md-4'; 

    if(exibir) {
        boxes.innerHTML = '';
        for(let i=0; i<4; i++) {
            boxes.innerHTML += `
            <div class="${colClass} col-6"> 
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

  var colClass = 'col-md-3';
  if(CONFIG_LOJA.ColunasDesktop == 3) colClass = 'col-md-4'; 
  if(CONFIG_LOJA.ColunasDesktop == 2) colClass = 'col-md-6';

  produtos.forEach(p => {
    var altText = p.Produto + " - " + p.Categoria; 
    var infoExtra = (p.Tamanhos || p.Variacoes) ? `<small>Opções disponíveis</small>` : '';
    const item = document.createElement('div');
    item.className = `${colClass} col-6 mt-4`;
    
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

// --- 4. MODAL DO PRODUTO (Ver + Simular Frete Individual) ---
var produtoAtual = null; 
var variacaoSelecionada = null;

function abrir_modal_ver(id) {
    var dados = JSON.parse(localStorage.getItem('calçados')) || [];
    produtoAtual = dados.find(p => p.ID === id);
    if (!produtoAtual) return;

    variacaoSelecionada = null; 
    document.getElementById('modalTituloProduto').innerText = produtoAtual.Produto;
    document.getElementById('modalPreco').innerText = 'R$ ' + parseFloat(produtoAtual.Preço).toFixed(2);
    document.getElementById('modalDescricaoTexto').innerText = produtoAtual.Descrição || "";

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

    var divVar = document.getElementById('areaVariacoes');
    var listaVar = document.getElementById('listaVariacoes');
    divVar.style.display = 'none';
    listaVar.innerHTML = '';

    if (produtoAtual.Tamanhos && produtoAtual.Tamanhos.trim() !== "") {
        divVar.style.display = 'block';
        var tamanhos = produtoAtual.Tamanhos.split(',').map(t => t.trim());
        tamanhos.forEach(tam => {
            var idBtn = 'var_' + tam;
            listaVar.innerHTML += `
                <input type="radio" class="btn-check" name="variacao" id="${idBtn}" autocomplete="off" onchange="selecionar_variacao('${tam}')">
                <label class="btn btn-outline-secondary" for="${idBtn}">${tam}</label>
            `;
        });
    } else {
        variacaoSelecionada = "Único"; 
    }

    var divMedidas = document.getElementById('areaTabelaMedidas');
    if (produtoAtual.TamanhosImagens && produtoAtual.TamanhosImagens.trim() !== "") {
        divMedidas.style.display = 'block';
        document.getElementById('imgTabelaMedidas').src = produtoAtual.TamanhosImagens;
    } else {
        divMedidas.style.display = 'none';
    }

    document.getElementById('btnAdicionarModal').onclick = function() {
        if (!variacaoSelecionada) {
            alert("Por favor, selecione uma opção (Tamanho/Variação).");
            return;
        }
        var nomeFinal = produtoAtual.Produto;
        var freteGratisUF = produtoAtual.FreteGratis || ""; 
        
        adicionar_carrinho(
            produtoAtual.ID + "_" + variacaoSelecionada, 
            nomeFinal, 
            produtoAtual.Preço, 
            produtoAtual.ImagemPrincipal, 
            freteGratisUF,
            variacaoSelecionada 
        );
        bootstrap.Modal.getInstance(document.getElementById('modalProduto')).hide();
    };

    // Reseta simulador individual
    document.getElementById('resultadoFreteIndividual').innerHTML = "";
    document.getElementById('inputSimulaCepIndividual').value = "";
    document.getElementById('btnSimularFreteIndividual').onclick = function() {
        simular_frete_produto_individual(produtoAtual);
    };

    new bootstrap.Modal(document.getElementById('modalProduto')).show();
}

function selecionar_variacao(valor) {
    variacaoSelecionada = valor;
}

function simular_frete_produto_individual(produto) {
    var cep = document.getElementById('inputSimulaCepIndividual').value.replace(/\D/g, '');
    if (cep.length !== 8) { alert("CEP inválido"); return; }

    var btn = document.getElementById('btnSimularFreteIndividual');
    var res = document.getElementById('resultadoFreteIndividual');
    
    btn.innerText = "...";
    btn.disabled = true;
    res.innerHTML = "Calculando...";

    var subsidio = parseFloat(CONFIG_LOJA.SubsidioFrete || 0);

    var dadosFrete = {
        op: "calcular_frete",
        cep: cep,
        peso: produto.Peso || 0.9,
        comprimento: produto.Comprimento || 20,
        altura: produto.Altura || 15,
        largura: produto.Largura || 20
    };

    fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(dadosFrete)
    })
    .then(r => r.json())
    .then(data => {
        btn.innerText = "OK";
        btn.disabled = false;
        
        if (data.erro) {
            res.innerHTML = `<span class="text-danger">${data.erro}</span>`;
            return;
        }

        fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(rv => rv.json())
        .then(cepData => {
            var ufDestino = cepData.uf || "";
            var html = '<ul class="list-unstyled mt-2">';
            var ehGratis = produto.FreteGratis && produto.FreteGratis.includes(ufDestino);

            data.opcoes.forEach(op => {
                var valor = parseFloat(op.valor);
                var nome = op.nome.toUpperCase();
                var isPac = nome.includes("PAC");
                var displayVal = valor;
                var tag = "";

                if(ehGratis) {
                    if(isPac) {
                        displayVal = 0;
                        tag = '<span class="badge bg-success">Grátis</span>';
                    } else {
                        displayVal = Math.max(0, valor - subsidio);
                        tag = '<span class="badge bg-info text-dark">Desconto</span>';
                    }
                } else {
                    displayVal = Math.max(0, valor - subsidio);
                    if(subsidio > 0) tag = '<span class="badge bg-info text-dark">Desconto</span>';
                }
                html += `<li><strong>${op.nome}</strong>: R$ ${displayVal.toFixed(2)} <small class="text-muted">(${op.prazo}d)</small> ${tag}</li>`;
            });
            html += '</ul>';
            res.innerHTML = html;
        });
    })
    .catch(e => {
        console.error(e);
        btn.innerText = "OK";
        btn.disabled = false;
        res.innerHTML = "Erro ao calcular.";
    });
}


// --- 5. CARRINHO ---

var freteCalculado = 0;
var freteSelecionadoNome = "";
var enderecoEntregaTemp = {}; 

function adicionar_carrinho(id, prod, preco, img, freteGratisUF, variacao) {
    var c = JSON.parse(localStorage.getItem('carrinho')) || [];
    var existe = c.find(i => i.id === id);
    
    if(existe) {
        existe.quantidade++; 
    } else {
        c.push({
            id: id, 
            producto: prod, 
            preco: preco, 
            imagem: img, 
            quantidade: 1, 
            freteGratisUF: freteGratisUF,
            variacao: variacao 
        });
    }
    localStorage.setItem('carrinho', JSON.stringify(c));
    atualizar_carrinho();
    
    freteCalculado = 0;
    freteSelecionadoNome = "";
    document.getElementById('carrinho_opcoes_frete').innerHTML = "";
    bloquearCheckout(true);
}

function editar_item_carrinho(idComVariacao) {
    var c = JSON.parse(localStorage.getItem('carrinho')) || [];
    var item = c.find(i => i.id === idComVariacao);
    
    if (item) {
        var idProdutoOriginal = idComVariacao.split('_')[0];
        remover_carrinho(idComVariacao);
        bootstrap.Modal.getInstance(document.getElementById('modalCarrito')).hide();
        setTimeout(() => {
            abrir_modal_ver(idProdutoOriginal);
        }, 500);
    }
}

function mudar_quantidade(id, delta) {
    var c = JSON.parse(localStorage.getItem('carrinho')) || [];
    var item = c.find(i => i.id === id);
    if(item) {
        item.quantidade += delta;
        if(item.quantidade <= 0) {
            c.splice(c.findIndex(i => i.id === id), 1);
        }
        localStorage.setItem('carrinho', JSON.stringify(c));
        atualizar_carrinho();
        bloquearCheckout(true);
        document.getElementById('carrinho_opcoes_frete').innerHTML = "Quantidade mudou. Recalcule o frete.";
        freteCalculado = 0;
    }
}

function remover_carrinho(id) {
    var c = JSON.parse(localStorage.getItem('carrinho'));
    c.splice(c.findIndex(i => i.id === id), 1);
    localStorage.setItem('carrinho', JSON.stringify(c));
    atualizar_carrinho();
    bloquearCheckout(true);
    freteCalculado = 0;
    document.getElementById('carrinho_opcoes_frete').innerHTML = "";
}

function atualizar_carrinho() {
    var c = JSON.parse(localStorage.getItem('carrinho')) || [];
    var div = document.getElementById('div_carrito');
    div.innerHTML = '';
    var subtotal = 0;
    
    if(c.length === 0) {
        div.innerHTML = '<p class="text-center text-muted">Seu carrinho está vazio.</p>';
        document.getElementById('total_carro_final').innerText = 'R$ 0.00';
        document.getElementById('valorTotal').innerText = 'R$ 0.00';
        return;
    }

    c.forEach(i => {
        var textoVariacao = (i.variacao && i.variacao !== 'Único') 
            ? `<div class="badge bg-secondary mt-1">Opção: ${i.variacao}</div>` 
            : '';

        var row = document.createElement('div');
        row.className = 'd-flex justify-content-between align-items-center mb-3 border-bottom pb-2';
        
        var btnEditar = (i.variacao && i.variacao !== 'Único')
            ? `<button class="btn btn-sm btn-outline-primary me-1" onclick="editar_item_carrinho('${i.id}')" title="Editar Opção"><i class="bi bi-pencil"></i></button>`
            : '';

        row.innerHTML = `
        <div class="d-flex align-items-center" style="width: 45%;">
            <img src="${i.imagem}" style="width:50px; height:50px; object-fit:cover; margin-right:10px; border-radius:5px;">
            <div>
                <div style="font-size:0.85rem; font-weight:bold; line-height: 1.2;">${i.producto}</div>
                ${textoVariacao}
                <div style="font-size:0.8rem; color:#666; margin-top:2px;">Unit: R$ ${parseFloat(i.preco).toFixed(2)}</div>
            </div>
        </div>
        
        <div class="d-flex align-items-center">
             <button class="btn btn-sm btn-outline-secondary px-2" onclick="mudar_quantidade('${i.id}', -1)">-</button>
             <span class="mx-2 font-weight-bold">${i.quantidade}</span>
             <button class="btn btn-sm btn-outline-secondary px-2" onclick="mudar_quantidade('${i.id}', 1)">+</button>
        </div>

        <div class="text-end d-flex flex-column align-items-end" style="width: 25%;">
             <div style="font-weight:bold; font-size: 0.9rem; margin-bottom: 5px;">R$ ${(i.preco*i.quantidade).toFixed(2)}</div>
             <div>
                ${btnEditar}
                <button class="btn btn-sm btn-outline-danger" onclick="remover_carrinho('${i.id}')" title="Excluir Item">
                    <i class="bi bi-trash"></i> 
                </button>
             </div>
        </div>`;
        div.appendChild(row);
        subtotal += i.preco * i.quantidade;
    });

    document.getElementById('resumo_subtotal').innerText = 'R$ ' + subtotal.toFixed(2);
    atualizarTotalFinal(subtotal);
}

function atualizarTotalFinal(subtotal) {
    var total = subtotal + freteCalculado;
    document.getElementById('resumo_frete').innerText = 'R$ ' + freteCalculado.toFixed(2);
    document.getElementById('total_carro_final').innerText = 'R$ ' + total.toFixed(2);
    
    var btnTotal = document.getElementById('valorTotal');
    if(btnTotal) btnTotal.innerText = 'R$ ' + total.toFixed(2);
}

// --- 6. FRETE NO CARRINHO ---

function buscarEnderecoSimples(cep) {
    cep = cep.replace(/\D/g, '');
    if(cep.length === 8) {
        fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(r => r.json())
        .then(d => {
            if(!d.erro) {
                document.getElementById('carrinho_endereco_resumo').innerText = `${d.localidade}/${d.uf}`;
                enderecoEntregaTemp = d; 
            }
        });
    }
}

function calcularFreteCarrinho() {
    var cep = document.getElementById('carrinho_cep').value.replace(/\D/g, '');
    if (cep.length !== 8) { alert("CEP inválido"); return; }
    
    var carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    if(carrinho.length === 0) return;

    var divOpcoes = document.getElementById('carrinho_opcoes_frete');
    divOpcoes.innerHTML = "Calculando...";
    bloquearCheckout(true);

    var todosProdutos = JSON.parse(localStorage.getItem('calçados')) || [];
    var pesoTotal = 0;
    var volumeTotal = 0;

    carrinho.forEach(item => {
        var prodOriginal = todosProdutos.find(p => p.ID == item.id.split('_')[0]);
        if (prodOriginal) {
            pesoTotal += (parseFloat(prodOriginal.Peso || 0.9) * item.quantidade);
            volumeTotal += (parseFloat(prodOriginal.Altura || 15) * parseFloat(prodOriginal.Largura || 20) * parseFloat(prodOriginal.Comprimento || 20)) * item.quantidade;
        } else {
            pesoTotal += (0.9 * item.quantidade);
            volumeTotal += (6000 * item.quantidade);
        }
    });

    var aresta = Math.pow(volumeTotal, 1/3);
    var alturaFinal = Math.max(15, Math.ceil(aresta));
    var larguraFinal = Math.max(15, Math.ceil(aresta));
    var compFinal = Math.max(20, Math.ceil(aresta));

    var dadosFrete = {
        op: "calcular_frete",
        cep: cep,
        peso: pesoTotal.toFixed(2), 
        comprimento: compFinal, 
        altura: alturaFinal, 
        largura: larguraFinal
    };

    fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(dadosFrete)
    })
    .then(r => r.json())
    .then(data => {
        if (data.erro) {
            divOpcoes.innerHTML = `<span class="text-danger">${data.erro}</span>`;
        } else if (data.opcoes) {
            var estadoDestino = enderecoEntregaTemp.uf || ""; 
            var html = '<div class="list-group">';
            var subsidio = parseFloat(CONFIG_LOJA.SubsidioFrete || 0);
            
            data.opcoes.forEach((op, index) => {
               var ehGratis = false;
               if(estadoDestino) {
                   ehGratis = carrinho.some(item => item.freteGratisUF && item.freteGratisUF.includes(estadoDestino));
               }

               var valorFinal = parseFloat(op.valor);
               var nomeServico = op.nome.toUpperCase();
               var textoExtra = "";
               var isPac = nomeServico.includes("PAC") || nomeServico.includes("ECONÔMICO");

               if (ehGratis) {
                   if (isPac) {
                       valorFinal = 0;
                       textoExtra = '<span class="badge bg-success ms-2">GRÁTIS</span>';
                   } else {
                       valorFinal = Math.max(0, valorFinal - subsidio);
                       textoExtra = '<span class="badge bg-info text-dark ms-2">Desconto Aplicado</span>';
                   }
               } else {
                   if(subsidio > 0) {
                       valorFinal = Math.max(0, valorFinal - subsidio);
                       textoExtra = `<span class="badge bg-info text-dark ms-2">Desconto Aplicado</span>`;
                   }
               }

               html += `
               <label class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <input class="form-check-input me-1" type="radio" name="freteRadio" value="${valorFinal}" data-nome="${op.nome}" onchange="selecionarFrete(this)">
                    ${op.nome} (${op.prazo} dias)
                    ${textoExtra}
                  </div>
                  <span class="fw-bold">R$ ${valorFinal.toFixed(2)}</span>
               </label>`;
            });
            html += '</div>';
            divOpcoes.innerHTML = html;
        }
    });
}

function selecionarFrete(input) {
    freteCalculado = parseFloat(input.value);
    freteSelecionadoNome = input.getAttribute('data-nome');
    var c = JSON.parse(localStorage.getItem('carrinho')) || [];
    var subtotal = c.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
    atualizarTotalFinal(subtotal);
    bloquearCheckout(false);
}

function bloquearCheckout(bloquear) {
    var btn = document.getElementById('btn_pagar');
    var msg = document.getElementById('msg_falta_frete');
    if(btn) btn.disabled = bloquear;
    if(msg) msg.style.display = bloquear ? 'block' : 'none';
}

// --- 7. CHECKOUT FINAL ---

function irParaCheckout() {
    bootstrap.Modal.getInstance(document.getElementById('modalCarrito')).hide();
    
    if(enderecoEntregaTemp.logradouro) {
        document.getElementById('checkout_rua').value = enderecoEntregaTemp.logradouro;
        document.getElementById('checkout_bairro').value = enderecoEntregaTemp.bairro;
        document.getElementById('checkout_cidade').value = enderecoEntregaTemp.localidade;
        document.getElementById('checkout_uf').value = enderecoEntregaTemp.uf;
        setTimeout(() => document.getElementById('checkout_numero').focus(), 500);
    }
    
    new bootstrap.Modal(document.getElementById('modalCheckout')).show();
}

// --- NOVO: BUSCA AUTOMÁTICA DE CLIENTE POR CPF ---
$(document).on('blur', '#checkout_cpf', function() {
    var cpf = $(this).val().replace(/\D/g, '');
    if (cpf.length === 11) {
        fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ op: "buscar_cliente", cpf: cpf })
        })
        .then(r => r.json())
        .then(dados => {
            if (dados.encontrado) {
                if (confirm("Identificamos um cadastro para este CPF. Deseja carregar seus dados de entrega automaticamente?")) {
                    document.getElementById('checkout_telefone').value = dados.telefone || "";
                    document.getElementById('checkout_rua').value = dados.rua || "";
                    document.getElementById('checkout_numero').value = dados.numero || "";
                    document.getElementById('checkout_bairro').value = dados.bairro || "";
                    document.getElementById('checkout_cidade').value = dados.cidade || "";
                    document.getElementById('checkout_uf').value = dados.uf || "";
                    document.getElementById('checkout_complemento').value = dados.complemento || "";
                }
            }
        });
    }
});

function iniciarPagamentoFinal() {
    var cliente = {
        cpf: document.getElementById('checkout_cpf').value,
        telefone: document.getElementById('checkout_telefone').value,
        cep: document.getElementById('carrinho_cep').value, 
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

    var btn = event.target;
    btn.innerText = "Processando...";
    btn.disabled = true;

    var carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    var items = carrinho.map(i => {
        var tituloCompleto = i.producto;
        if(i.variacao && i.variacao !== "Único") tituloCompleto += " - " + i.variacao;
        return {
            title: tituloCompleto, 
            quantity: i.quantity, 
            currency_id: 'BRL', 
            unit_price: parseFloat(i.preco)
        };
    });
    
    if (freteCalculado > 0) {
        items.push({
            title: "Frete (" + freteSelecionadoNome + ")",
            quantity: 1,
            currency_id: 'BRL',
            unit_price: freteCalculado
        });
    }

    // DADOS LOGÍSTICOS PARA PLANILHA
    var logisticaInfo = {
        servico: freteSelecionadoNome,
        peso: (carrinho.reduce((t, i) => t + (i.quantidade * 0.9), 0)).toFixed(2),
        dimensoes: "Calculado via Carrinho"
    };

    fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({cliente: cliente, items: items, logistica: logisticaInfo})
    })
    .then(r => r.text())
    .then(link => { window.location.href = link; })
    .catch(e => { 
        alert("Erro ao processar."); 
        btn.innerText = "Tentar Novamente"; 
        btn.disabled = false; 
    });
}

// --- 8. INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", function(){
    carregar_config();
    atualizar_carrinho();

    const modais = ['modalProduto', 'modalCarrito', 'modalCheckout', 'modalLogin', 'modalUsuario'];
    const btnFloat = document.getElementById('btn_carrinho_flutuante');

    modais.forEach(id => {
        var el = document.getElementById(id);
        if(el) {
            el.addEventListener('show.bs.modal', () => { if(btnFloat) btnFloat.style.display = 'none'; });
            el.addEventListener('hidden.bs.modal', () => { 
                if(!document.querySelector('.modal.show') && btnFloat) btnFloat.style.display = 'block'; 
            });
        }
    });
});
