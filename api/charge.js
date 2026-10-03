// Função serverless da Vercel: cria a cobrança PIX na NovaPay.
// Variáveis de ambiente (Vercel > Settings > Environment Variables):
//   NOVAPAY_CI  = seu client id
//   NOVAPAY_CS  = sua chave secreta (NUNCA coloque no código)
//   NOVAPAY_AMOUNT_IN_CENTS = "1" só se a NovaPay exigir o valor em centavos (padrão: reais)
const PRECO = 15.5;      // preço unitário
const PRECO2 = 29.9;     // preço de cada 2 unidades
const total = n => Math.floor(n / 2) * PRECO2 + (n % 2) * PRECO;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });
  const ci = process.env.NOVAPAY_CI, cs = process.env.NOVAPAY_CS;
  if (!ci || !cs) return res.status(500).json({ ok: false, error: 'Credenciais não configuradas' });

  const b = req.body || {};
  const q = parseInt(b.quantidade, 10);
  if (!(q >= 1 && q <= 20)) return res.status(400).json({ ok: false, error: 'Quantidade inválida' });

  // O valor é calculado aqui no servidor, nunca vem do navegador.
  let amount = Math.round(total(q) * 100) / 100;
  if (process.env.NOVAPAY_AMOUNT_IN_CENTS === '1') amount = Math.round(amount * 100);

  const numero = String(b.numero || '').slice(0, 30);
  try {
    const r = await fetch('https://api.anovapay.com.br/charges', {
      method: 'POST',
      headers: { ci, cs, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description: `Pedido ${numero} - Limpalar x${q}` })
    });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch (_) { data = { raw: txt }; }
    if (!r.ok) return res.status(502).json({ ok: false, error: 'Falha no gateway', status: r.status, detail: data });
    return res.status(200).json({ ok: true, charge: data });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'Gateway indisponível' });
  }
};
