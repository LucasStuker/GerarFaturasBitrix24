# 🔄 Geração Automática de Faturas (Bitrix24)

Este projeto é uma API desenvolvida em Node.js que integra com o Bitrix24 para gerar automaticamente faturas (CRM item) com base em um negócio (`deal_id`). A API verifica condições como forma de pagamento, dados da empresa e valores financeiros, calcula parcelas e cria faturas mensalmente com vencimento e data de fechamento programadas.

## 🚀 Funcionalidades

- Consulta um negócio no Bitrix24 via `deal_id`
- Valida a forma de pagamento como "Boleto"
- Calcula parcelas com base no valor restante e valor unitário do boleto
- Gera faturas no Bitrix24 utilizando `crm.item.add`
- Suporte a métodos `GET` e `POST` com `deal_id` via query ou corpo
- Log com status de criação e erros

## 🛠️ Tecnologias

- Node.js
- Axios
- API REST do Bitrix24

## 📦 Instalação

1. Clone este repositório:
   ```bash
   git clone https://github.com/seu-usuario/bitrix24-faturas.git
   cd bitrix24-faturas
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Edite o arquivo `handler.js` e configure sua URL de webhook do Bitrix24:
   ```js
   const WEBHOOK_URL = 'https://SEU_DOMINIO.bitrix24.com/rest/SEU_WEBHOOK/';
   ```

> 💡 Você também pode mover essa variável para um arquivo `.env` e usar `dotenv` para mais segurança.

## ▶️ Uso

### Via `GET`:
```bash
curl http://localhost:3000/api/faturas?deal_id=123
```

### Via `POST`:
```bash
curl -X POST http://localhost:3000/api/faturas \
     -H "Content-Type: application/json" \
     -d '{"deal_id": "123"}'
```

### Exemplo de resposta:
```json
{
  "status": "Faturas geradas com sucesso"
}
```

### Possíveis erros:
- `Forma de pagamento não é boleto`
- `Empresa do negócio não encontrada`
- `Campos obrigatórios ausentes ou inválidos`
- `deal_id é obrigatório`
- `Erro ao gerar faturas`

## ⚙️ Campos Personalizados

Edite os seguintes campos de acordo com os campos personalizados configurados no seu Bitrix24:

| Campo Bitrix24 | Descrição |
|----------------|-----------|
| `OPPORTUNITY` | Valor total do negócio |
| `UF_CRM_DEAL_1733226466881` | Valor no crédito |
| `UF_CRM_DEAL_1733226515325` | Valor à vista |
| `UF_CRM_DEAL_1733226375043` | Valor por boleto |
| `UF_CRM_DEAL_1733225929790` | Forma de pagamento (array) |
| `UF_CRM_1733754864657` | Data de início das parcelas (YYYY-MM-DD) |

## ✅ Requisitos

- Conta Bitrix24 com acesso a Webhooks REST
- CRM com campos personalizados configurados corretamente
- Node.js v16 ou superior

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).