import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[INÍCIO] Requisição recebida para gerar faturas.');

    const { deal_id } = req.body;
    if (!deal_id) {
      console.error('[ERRO] deal_id ausente no corpo da requisição.');
      return res.status(400).json({ error: 'deal_id é obrigatório' });
    }
    console.log('[INFO] ID do negócio recebido:', deal_id);

    const WEBHOOK_URL = 'https://ecosystem.praiastur.com.br/rest/14877/i458pb5u53jin1wk/';

    // Usar GET com params para pegar o negócio
    const { data: dealRes } = await axios.get(`${WEBHOOK_URL}crm.deal.get`, { params: { id: deal_id } });
    if (!dealRes.result) {
      console.error('[ERRO] Negócio não encontrado ou resposta inválida:', dealRes);
      return res.status(404).json({ error: 'Negócio não encontrado' });
    }
    const deal = dealRes.result;
    console.log('[INFO] Dados do negócio:', deal);

    const valorTotal = parseFloat(deal.OPPORTUNITY || 0);
    const valorCredito = parseFloat(deal.UF_CRM_DEAL_1733226466881 || 0);
    const valorVista = parseFloat(deal.UF_CRM_DEAL_1733226515325 || 0);
    const valorBoleto = parseFloat(deal.UF_CRM_DEAL_1733226375043 || 0);
    const formaPagamentoArray = deal.UF_CRM_DEAL_1733225929790 || [];
    const formaPagamento = formaPagamentoArray[0]?.toString().trim() || '';

    const contatoId = deal.CONTACT_ID;
    const empresaId = deal.COMPANY_ID;

    if (formaPagamento !== '191913') {
      console.log('[AVISO] Forma de pagamento não é boleto.');
      return res.status(200).json({ error: 'Forma de pagamento não é boleto' });
    }

    if (!empresaId) {
      console.error('[ERRO] empresaId ausente no negócio.');
      return res.status(400).json({ error: 'Empresa do negócio não encontrada' });
    }

    // Usar GET para pegar empresa
    const { data: companyRes } = await axios.get(`${WEBHOOK_URL}crm.company.get`, { params: { id: empresaId } });
    if (!companyRes.result) {
      console.error('[ERRO] Empresa não encontrada ou resposta inválida:', companyRes);
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    const empresaNome = companyRes.result.TITLE || 'Empresa';
    console.log('[INFO] Nome da empresa:', empresaNome);

    let valorRestante = valorTotal - valorCredito - valorVista;
    if (!valorRestante || !valorBoleto || !contatoId) {
      console.error('[ERRO] Campos obrigatórios ausentes ou inválidos:', { valorRestante, valorBoleto, contatoId });
      return res.status(400).json({ error: 'Campos obrigatórios ausentes ou inválidos' });
    }

    const parcelas = Math.ceil(valorRestante / valorBoleto);
    const begindate = new Date();

    for (let i = 0; i < parcelas; i++) {
      const valorParcela = valorRestante >= valorBoleto ? valorBoleto : valorRestante;
      const vencimento = new Date(begindate);
      vencimento.setMonth(begindate.getMonth() + i);
      const closedate = new Date(vencimento);
      closedate.setDate(closedate.getDate() + 40);
      const saldoRestanteAtualizado = valorRestante - valorParcela;

      const titulo = `${empresaNome} Parcela ${i + 1}/${parcelas} - Negócio ${deal_id}`;
      console.log(`[FATURA ${i + 1}] Criando com vencimento ${vencimento.toISOString().split('T')[0]}`);

      const payload = {
        entityTypeId: 31,
        fields: {
          TITLE: titulo,
          OPPORTUNITY: valorParcela,
          COMMENTS: `Saldo restante após esta fatura: R$ ${saldoRestanteAtualizado.toFixed(2)}`,
          UF_DEAL_ID: deal_id,
          COMPANY_ID: empresaId,
          CONTACT_ID: contatoId,
          UF_COMPANY_ID: empresaId,
          UF_CONTACT_ID: contatoId,
          BEGINDATE: vencimento.toISOString().split('T')[0],
          CLOSEDATE: closedate.toISOString().split('T')[0],
          PAY_SYSTEM_ID: 1,
        },
        parentId2: deal_id,
        CATEGORY_ID: 9
      };

      const response = await axios.post(`${WEBHOOK_URL}crm.item.add`, payload);
      console.log(`[FATURA ${i + 1}] Item criado:`, response.data.result);

      valorRestante -= valorParcela;
      await new Promise(resolve => setTimeout(resolve, 300)); // delay entre requisições
    }

    console.log('[SUCESSO] Faturas geradas com sucesso.');
    return res.status(200).json({ status: 'Faturas geradas com sucesso' });

  } catch (error) {
    console.error('[ERRO]', error?.response?.data || error.message || error);
    return res.status(500).json({ error: 'Erro ao gerar faturas' });
  }
}
