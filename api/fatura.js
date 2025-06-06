import axios from 'axios';

export default async function handler(req, res) {
  const method = req.method;
  let dealId;

  // ✅ Aceitar deal_id via POST ou GET e sanitizar
  if (method === 'POST') {
    dealId = req.body.deal_id;
  } else if (method === 'GET') {
    dealId = req.query.deal_id;
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Sanitizar ID: remover espaços e underscores extras
  if (typeof dealId === 'string') {
    dealId = dealId.replace(/[^0-9]/g, ''); // remove tudo que não for número
  }

  if (!dealId) {
    return res.status(400).json({ error: 'deal_id é obrigatório e deve ser válido' });
  }

  try {
    console.log('[INÍCIO] Gerando faturas para o negócio:', dealId);

    const WEBHOOK_URL = 'https://ecosystem.praiastur.com.br/rest/14877/i458pb5u53jin1wk/';

    // Buscar negócio
    const { data: dealRes } = await axios.get(`${WEBHOOK_URL}crm.deal.get`, { params: { id: dealId } });
    const deal = dealRes?.result;
    if (!deal) {
      console.error('[ERRO] Negócio não encontrado:', dealId);
      return res.status(404).json({ error: 'Negócio não encontrado' });
    }

    const valorTotal = parseFloat(deal.OPPORTUNITY || 0);
    const valorCredito = parseFloat(deal.UF_CRM_DEAL_1733226466881 || 0);
    const valorVista = parseFloat(deal.UF_CRM_DEAL_1733226515325 || 0);
    const valorBoleto = parseFloat(deal.UF_CRM_DEAL_1733226375043 || 0);
    const formaPagamentoArray = deal.UF_CRM_DEAL_1733225929790 || [];
    const formaPagamento = formaPagamentoArray[0]?.toString().trim() || '';
    const contatoId = deal.CONTACT_ID;
    const empresaId = deal.COMPANY_ID;

    if (formaPagamento !== '191913') {
      console.log('[INFO] Forma de pagamento não é boleto. Encerrando.');
      return res.status(200).json({ error: 'Forma de pagamento não é boleto' });
    }

    if (!empresaId) {
      console.error('[ERRO] Empresa não vinculada ao negócio.');
      return res.status(400).json({ error: 'Empresa do negócio não encontrada' });
    }

    // Buscar empresa
    const { data: companyRes } = await axios.get(`${WEBHOOK_URL}crm.company.get`, { params: { id: empresaId } });
    const empresaNome = companyRes?.result?.TITLE || 'Empresa';

    let valorRestante = valorTotal - valorCredito - valorVista;

    if (!valorRestante || !valorBoleto || !contatoId) {
      console.error('[ERRO] Campos ausentes ou inválidos:', { valorRestante, valorBoleto, contatoId });
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

      const titulo = `${empresaNome} Parcela ${i + 1}/${parcelas} - Negócio ${dealId}`;

      const payload = {
        entityTypeId: 31,
        fields: {
          TITLE: titulo,
          OPPORTUNITY: valorParcela,
          COMMENTS: `Saldo restante após esta fatura: R$ ${saldoRestanteAtualizado.toFixed(2)}`,
          UF_DEAL_ID: dealId,
          COMPANY_ID: empresaId,
          CONTACT_ID: contatoId,
          UF_COMPANY_ID: empresaId,
          UF_CONTACT_ID: contatoId,
          BEGINDATE: vencimento.toISOString().split('T')[0],
          CLOSEDATE: closedate.toISOString().split('T')[0],
          PAY_SYSTEM_ID: 1,
        },
        parentId2: dealId,
        CATEGORY_ID: 9,
      };

      const response = await axios.post(`${WEBHOOK_URL}crm.item.add`, payload);
      console.log(`[FATURA ${i + 1}/${parcelas}] Criada com ID:`, response.data.result);

      valorRestante -= valorParcela;
      await new Promise(resolve => setTimeout(resolve, 300)); // evitar rate limit
    }

    console.log('[SUCESSO] Todas as faturas foram geradas com sucesso.');
    return res.status(200).json({ status: 'Faturas geradas com sucesso' });

  } catch (error) {
    console.error('[ERRO INTERNO]', error?.response?.data || error.message || error);
    return res.status(500).json({ error: 'Erro ao gerar faturas' });
  }
}
