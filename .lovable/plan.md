# Checkout em 4 etapas e correção do Mercado Pago

## Objetivo
Transformar o fluxo entre sacola, checkout e pagamento em quatro etapas sequenciais, preservando os dados ao editar e garantindo que o pedido só seja criado quando todas as etapas estiverem concluídas.

## Implementação
- Ajustar o checkout para controlar explicitamente a conclusão das etapas 1 a 4.
- Manter bloqueadas as etapas posteriores até a anterior ser salva e validada.
- Exibir resumo compacto e ação “Alterar” nas etapas concluídas.
- Invalidar corretamente as etapas dependentes quando dados pessoais, endereço, CEP ou frete forem alterados.
- Só habilitar “Ir para o pagamento” após dados pessoais, endereço e frete estarem salvos e a etapa de pagamento estar liberada.
- Manter o autopreenchimento por CEP e mostrar as opções de frete somente após o endereço ser salvo.
- Manter CPF/CNPJ fora do checkout principal; coletá-lo na etapa intermediária de pagamento antes de abrir o Checkout Pro.

## Mercado Pago
- Revisar e corrigir a preferência do Checkout Pro para enviar pagador, CPF/CNPJ, telefone, endereço, itens, frete, URLs de retorno e webhook no formato aceito pela API.
- Validar que os valores dos itens e do frete correspondem ao total do pedido.
- Melhorar o retorno de erro para distinguir falha ao criar a preferência de bloqueio ocorrido já na página externa.
- Verificar o fluxo autenticado até a geração do link do Mercado Pago e documentar qualquer restrição externa que não possa ser resolvida no código, como tentar pagar usando a própria conta vendedora.

## Validação
- Testar as quatro etapas, edição de etapas já salvas, troca de CEP/frete e bloqueio do botão final.
- Executar as verificações automatizadas do projeto.
- Testar a criação de uma preferência de pagamento e o redirecionamento para o Checkout Pro sem expor credenciais.
