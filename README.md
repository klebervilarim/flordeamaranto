# Perfumaria Flor de Amaranto

PROMPT LOVABLE — E-COMMERCE DE PERFUMARIA, COSMÉTICOS E BELEZA

Crie uma aplicação web completa, moderna, responsiva e preparada para produção para uma loja especializada em PERFUMES, COSMÉTICOS E PRODUTOS DE BELEZA.

O negócio começará com foco em perfumes árabes, mas a arquitetura NÃO deve ser limitada a esse segmento.

No futuro, a loja poderá vender:

Perfumes árabes

Perfumes de nicho

Perfumes importados

Perfumes nacionais

Perfumes masculinos

Perfumes femininos

Perfumes unissex

Cosméticos

Skincare

Produtos para corpo e banho

Produtos para cabelo

Maquiagem

Kits e presentes

Outros produtos relacionados à beleza

A aplicação deve ser construída desde o início para permitir essa expansão sem necessidade de alterar a arquitetura principal.

Nome provisório da loja:

OUD ROYALE

IMPORTANTE:

O nome e a identidade visual devem transmitir sofisticação e perfumaria premium, mas a aplicação não deve ficar visualmente ou tecnicamente limitada a perfumes árabes.

O objetivo é construir uma marca de perfumaria e beleza premium, começando pelos perfumes árabes.

==================================================

CONCEITO DO NEGÓCIO
==================================================

A loja deve ser posicionada como:

“Um destino premium para perfumes, beleza e autocuidado.”

O foco inicial será:

Perfumes Árabes

Mas o sistema deve permitir adicionar facilmente:

Perfumes de Nicho
Perfumes Importados
Perfumes Nacionais
Cosméticos
Skincare
Body Care
Maquiagem

Não criar regras de negócio que assumam que todo perfume é árabe.

A origem/estilo do perfume deve ser apenas uma propriedade do produto.

==================================================




2. ESTRUTURA PRINCIPAL DO CATÁLOGO

Criar uma arquitetura baseada em múltiplas dimensões.

Um produto pode possuir:

TIPO DE PRODUTO:

Perfume

Cosmético

Skincare

Maquiagem

Corpo & Banho

Cabelo

Kit

Acessório

Outro

CATEGORIA:

Masculino

Feminino

Unissex

Infantil, se necessário futuramente

ORIGEM / ESTILO:

Árabe

Nicho

Importado

Nacional

Designer

Artesanal

Outro

MARCA:

Exemplos:

Lattafa
Afnan
Rasasi
Armaf
Al Haramain
Maison Alhambra
Swiss Arabian
Khadlaj
Fragrance World
Ajmal

Mas permitir adicionar qualquer nova marca.

FAMÍLIA OLFATIVA:

Amadeirado

Oriental

Floral

Cítrico

Frutado

Gourmand

Aromático

Couro

Chipre

Aquático

Musk

Âmbar

Especiado

Verde

Um produto pode possuir mais de uma família olfativa.

==================================================




3. IDENTIDADE VISUAL

Criar uma identidade premium.

Estilo:

Elegante

Luxuoso

Minimalista

Moderno

Sofisticado

Clean

Premium

A estética pode possuir referências árabes porque o catálogo inicial será focado em perfumes árabes, porém NÃO criar uma identidade exclusivamente árabe.

Paleta:

Preto

Dourado

Off-white

Creme

Bege

Marrom

Verde esmeralda como detalhe

Usar dourado em detalhes e elementos premium.

Evitar excesso de ornamentos.

==================================================




4. HEADER

Criar header fixo.

Logo:

OUD ROYALE

Menu principal:

Home
Perfumes
Cosméticos
Skincare
Corpo & Banho
Maquiagem
Marcas
Ofertas

Não colocar “Perfumes Árabes” como categoria principal fixa.

Em vez disso, permitir filtros e coleções para:

Perfumes Árabes
Perfumes de Nicho
Importados
Nacionais

Adicionar:

Busca
Conta
Favoritos
Carrinho

==================================================




5. HOME

Criar uma Home premium.

HERO:

Título:

“Encontre a fragrância que combina com você.”

Subtítulo:

“Perfumes, beleza e autocuidado selecionados para transformar sua experiência.”

Botões:

“Comprar perfumes”

“Explorar coleção”

O Hero pode inicialmente destacar perfumes árabes.

Criar banners que possam ser alterados pelo administrador.

Exemplos:

“Descubra os melhores perfumes árabes”

“Perfumes de nicho”

“Novidades”

“Ofertas especiais”

“Cosméticos e skincare”

==================================================




6. NAVEGAÇÃO POR PERFUMARIA

Criar uma página:

/perfumes

No catálogo permitir combinar filtros.

Filtros:

Gênero:

Masculino

Feminino

Unissex

Origem:

Árabe

Nicho

Importado

Nacional

Designer

Marca

Família olfativa

Notas

Ocasião

Intensidade

Fixação

Projeção

Faixa de preço

Volume

Avaliação

Promoção

Disponibilidade

==================================================




7. COLEÇÕES

Criar conceito de “Coleções”.

As coleções são diferentes de categorias.

Exemplos:

Perfumes Árabes
Perfumes de Nicho
Perfumes Masculinos
Perfumes Femininos
Perfumes Unissex
Mais Vendidos
Novidades
Ofertas
Perfumes para Noite
Perfumes para o Dia
Perfumes Gourmand
Perfumes Amadeirados

O administrador deve conseguir criar novas coleções sem alterar código.

Uma coleção pode conter produtos de diferentes categorias.

==================================================




8. PRODUCT CARD

Criar componente ProductCard reutilizável.

Mostrar:

Imagem
Marca
Nome
Categoria
Origem/estilo
Avaliação
Preço
Preço promocional
Parcelamento
Desconto

Badges:

Novo
Mais vendido
Oferta
Exclusivo
Últimas unidades

Ações:

Adicionar ao carrinho
Favoritar

==================================================




9. PÁGINA DO PRODUTO

Criar:

/produto/[slug]

A página deve funcionar para qualquer tipo de produto.

Informações gerais:

Marca
Nome
SKU
Categoria
Origem
Gênero
Avaliação
Preço
Promoção
Parcelamento
Estoque
Quantidade

Botões:

Comprar agora
Adicionar ao carrinho
Favoritar

==================================================




10. PERFUMES — CAMPOS ESPECÍFICOS

Quando tipo_produto = PERFUME, mostrar:

Origem/estilo:

Árabe
Nicho
Importado
Nacional
Designer

Gênero:

Masculino
Feminino
Unissex

Família olfativa

Notas de saída

Notas de coração

Notas de fundo

Intensidade

Fixação

Projeção

Volume

Ocasião

Estação

Dia/noite

Criar representação visual das notas olfativas.

==================================================




11. COSMÉTICOS

Quando tipo_produto = COSMÉTICO, permitir:

Tipo

Marca

Indicação

Tipo de pele

Benefícios

Ingredientes

Modo de uso

Volume/peso

Validade

Origem

==================================================




12. SKINCARE

Campos:

Tipo de pele:

Seca
Oleosa
Mista
Normal
Sensível

Objetivos:

Hidratação
Anti-idade
Controle de oleosidade
Acne
Uniformização
Iluminação
Proteção
Revitalização

Ingredientes principais

Modo de uso

Precauções

==================================================




13. MAQUIAGEM

Campos:

Tipo de produto

Cor

Tom

Acabamento

Cobertura

Tipo de pele

Volume/peso

Benefícios

Modo de uso

==================================================




14. CORPO, BANHO E CABELO

Criar estrutura flexível para:

Hidratantes
Óleos
Sabonetes
Esfoliantes
Body Splash
Shampoo
Condicionador
Máscaras
Óleos capilares
Leave-in
Tratamentos

==================================================




15. BUSCA INTELIGENTE

Criar busca global.

Pesquisar por:

Nome
Marca
SKU
Categoria
Origem
Gênero
Família olfativa
Notas
Ingredientes
Características

Exemplos:

“Lattafa”

“Perfume árabe”

“Perfume de nicho”

“Masculino”

“Doce”

“Amadeirado”

“Skincare”

“Hidratante”

Criar autocomplete.

==================================================




16. FILTROS DINÂMICOS

Os filtros devem mudar conforme a categoria.

Exemplo:

Se estiver em PERFUMES:

Mostrar:

Gênero
Origem
Família olfativa
Notas
Fixação
Projeção

Se estiver em SKINCARE:

Mostrar:

Tipo de pele
Objetivo
Ingredientes

Se estiver em MAQUIAGEM:

Mostrar:

Cor
Tom
Acabamento
Cobertura
Tipo de pele

Não mostrar filtros irrelevantes.

==================================================




17. RECOMENDAÇÃO DE PERFUMES

Criar funcionalidade:

“Encontre seu perfume ideal”

Quiz:

Masculino, feminino ou unissex?

Prefere doce, fresco, amadeirado, floral ou oriental?

Dia ou noite?

Projeção alta ou moderada?

Fixação alta ou moderada?

Qual faixa de preço?

Prefere árabe, nicho, importado ou qualquer estilo?

Mostrar os 3 melhores resultados.

Explicar:

“Recomendamos este perfume porque…”

==================================================




18. CARRINHO

Criar:

/carrinho

Mostrar:

Imagem
Produto
Marca
Quantidade
Preço
Subtotal
Remover

Resumo:

Subtotal
Desconto
Frete
Total

CEP

Cupom

Botão:

Continuar compra

==================================================




19. CHECKOUT

Etapas:

Identificação

Endereço

Entrega

Pagamento

Revisão

Pagamento:

PIX
Cartão
Boleto

Preparar arquitetura para integração futura com:

Mercado Pago
Stripe
PagSeguro
Outro gateway

==================================================




20. CLIENTE

Criar:

/minha-conta

Seções:

Meus pedidos
Dados pessoais
Endereços
Favoritos
Cupons
Avaliações
Sair

Timeline de pedidos:

Pedido realizado
Pagamento aprovado
Preparando
Enviado
Em trânsito
Entregue
Cancelado

==================================================




21. FAVORITOS

Criar sistema de favoritos.

Página:

/favoritos

Permitir favoritar qualquer produto.

==================================================




22. AVALIAÇÕES

Permitir avaliação.

Campos:

Nota
Título
Comentário
Fotos

Para perfumes:

Nota geral
Fixação
Projeção
Custo-benefício

==================================================




23. KITS E COMBOS

Permitir criar:

Kit Perfume + Hidratante
Kit Skincare
Kit Presente
Kit Masculino
Kit Feminino
Kit Árabe

O administrador pode montar kits com qualquer combinação de produtos.

Mostrar:

Preço individual
Preço do kit
Economia

==================================================




24. PRESENTES

Criar coleção:

“Presentes”

Filtros:

Para ele
Para ela
Casal
Aniversário
Datas especiais
Luxo
Até R$ 200
Até R$ 300
Acima de R$ 500

==================================================




25. MARCAS

Criar:

/marcas

Mostrar todas as marcas.

Permitir futuramente cadastrar:

Marcas árabes
Marcas de nicho
Marcas nacionais
Marcas importadas
Marcas de cosméticos

==================================================




26. ADMINISTRADOR

Criar:

/admin

Dashboard:

Faturamento
Pedidos
Ticket médio
Clientes
Produtos vendidos
Estoque baixo

Gráficos:

Faturamento
Vendas por categoria
Vendas por origem
Vendas por marca
Produtos mais vendidos

==================================================




27. ADMIN — PRODUTOS

CRUD completo.

Criar
Editar
Duplicar
Excluir
Ativar/desativar
Alterar preço
Alterar estoque
Adicionar imagens
Criar promoção
Associar marca
Associar categoria
Associar coleção

O formulário deve ser dinâmico.

Se:

tipo_produto = PERFUME

mostrar campos de perfumaria.

Se:

tipo_produto = SKINCARE

mostrar campos de skincare.

Se:

tipo_produto = MAQUIAGEM

mostrar campos de maquiagem.

Isso deve ser implementado de maneira modular.

==================================================




28. ESTOQUE

Campos:

SKU
Estoque atual
Estoque mínimo
Status

Status:

Em estoque
Últimas unidades
Esgotado

Movimentações:

Entrada
Venda
Ajuste
Devolução

==================================================




29. CUPONS

Criar:

Código
Tipo
Valor
Percentual
Data inicial
Data final
Valor mínimo
Quantidade máxima
Categorias
Marcas
Coleções
Ativo

==================================================




30. BLOG

Criar estrutura de blog.

Categorias:

Perfumes
Perfumes árabes
Perfumes de nicho
Guia de fragrâncias
Skincare
Beleza
Cuidados pessoais
Tendências
Novidades

==================================================




31. WHATSAPP

Botão flutuante.

Mensagem geral:

“Olá! Gostaria de saber mais sobre os produtos da Oud Royale.”

No produto:

“Olá! Tenho interesse no produto [NOME].”

==================================================




32. BANCO DE DADOS

Utilizar Supabase.

Criar tabelas:

users
profiles
products
product_types
categories
subcategories
brands
collections
product_collections
product_images
product_variants
orders
order_items
cart
cart_items
favorites
addresses
coupons
reviews
review_images
inventory
inventory_movements
kits
kit_items
blog_posts
newsletter_subscribers

==================================================




33. MODELO DE PRODUTO

Criar modelo genérico.

Campos obrigatórios:

id
sku
nome
slug
marca
tipo_produto
categoria
subcategoria
descrição
preço
preço_promocional
estoque
estoque_minimo
peso
volume
imagens
status
destaque
mais_vendido
novo
promoção

Campos de perfumaria:

origem_estilo
gênero
famílias_olfativas
notas_saida
notas_coracao
notas_fundo
fixação
projeção
intensidade
ocasião
estação

Campos de skincare:

tipo_pele
objetivos
ingredientes
modo_uso
precauções

Campos de maquiagem:

cor
tom
acabamento
cobertura
tipo_pele

IMPORTANTE:

Não criar campos obrigatórios específicos de perfume para todos os produtos.

A estrutura deve permitir que um produto de cosmético não tenha informações de perfumaria.

==================================================




34. PRODUTOS INICIAIS

Criar pelo menos 30 produtos de demonstração.

Inicialmente priorizar:

PERFUMES ÁRABES

Exemplos de marcas:

Lattafa
Afnan
Rasasi
Armaf
Al Haramain
Maison Alhambra
Swiss Arabian
Khadlaj
Fragrance World
Ajmal

Adicionar alguns produtos fictícios de:

Cosméticos
Skincare
Body Care

IMPORTANTE:

A arquitetura deve permitir que futuramente sejam adicionados perfumes de nicho, importados e nacionais sem nenhuma alteração estrutural.

==================================================




35. MOBILE

Mobile First.

Produtos em 2 colunas.

Menu hamburger.

Busca.

Filtros em modal.

Carrinho.

Favoritos.

Conta.

Criar bottom navigation:

Home
Buscar
Favoritos
Carrinho
Conta

==================================================




36. SEO

URLs:

/perfumes
/perfumes/arabes
/perfumes/nicho
/perfumes/importados
/perfumes/nacionais
/perfumes/masculinos
/perfumes/femininos
/perfumes/unissex

Para produtos:

/produto/[slug]

Também permitir URLs de categorias:

/skincare
/cosmeticos
/maquiagem
/corpo-e-banho

==================================================




37. ESCALABILIDADE

A arquitetura deve ser preparada para crescer.

No futuro poderemos adicionar:

Gateway de pagamento
Correios
Melhor Envio
Mercado Pago
Stripe
Google Analytics
Meta Pixel
Instagram Shopping
WhatsApp Commerce
Programa de fidelidade
Cashback
Afiliados
Marketplace
IA para recomendação
CRM
Automação de marketing

Não criar código acoplado a uma única categoria de produto.

==================================================




38. PRINCÍPIO FUNDAMENTAL DA APLICAÇÃO

A aplicação deve ser construída com esta lógica:

MARCA
↓
PRODUTO
↓
TIPO DE PRODUTO
↓
CATEGORIA
↓
SUBCATEGORIA
↓
ATRIBUTOS ESPECÍFICOS
↓
COLEÇÕES
↓
FILTROS

Não assumir:

“Produto = perfume árabe”

O correto é:

“Produto = entidade genérica”

Um produto pode ser:

Perfume + Árabe + Masculino + Lattafa + Amadeirado

Outro:

Perfume + Nicho + Unissex + Marca X + Floral

Outro:

Perfume + Importado + Feminino + Marca Y + Gourmand

Outro:

Skincare + Hidratante + Pele Oleosa

Todos devem coexistir no mesmo catálogo.

==================================================




39. EXPERIÊNCIA FINAL

Quero que o resultado pareça uma loja de e-commerce premium real.

Não criar somente uma landing page.

Criar:

Home

Catálogo

Categorias

Coleções

Marcas

Busca

Filtros

Produto

Carrinho

Checkout

Login

Cadastro

Área do cliente

Favoritos

Avaliações

Quiz de recomendação

Kits

Ofertas

Blog

Administração

Estoque

Cupons

Utilizar:

React
TypeScript
Tailwind CSS
shadcn/ui
Supabase

Criar componentes reutilizáveis e arquitetura modular.

Priorizar:

Experiência do usuário

Visual premium

Mobile First

Escalabilidade

Performance

SEO

Facilidade de administração

Comece construindo a estrutura completa da aplicação, banco de dados, autenticação, catálogo, produtos, carrinho e layout visual premium.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://flordeamaranto.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d918a796-86e9-4271-baca-eeb6b7351bf7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
