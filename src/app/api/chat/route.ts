import { NextRequest, NextResponse } from 'next/server';

// Mapeamento dos signos para Cafe Astrology
const cafeAstrologySignos = {
  aries: 'aries',
  touro: 'taurus',
  gemeos: 'gemini',
  cancer: 'cancer',
  leao: 'leo',
  virgem: 'virgo',
  libra: 'libra',
  escorpiao: 'scorpio',
  sagitario: 'sagittarius',
  capricornio: 'capricorn',
  aquario: 'aquarius',
  peixes: 'pisces'
};

// Mapeamento de variantes para detecção de signos
const signosMap = {
  aries: ['aries', 'áries'],
  touro: ['touro'],
  gemeos: ['gemeos', 'gêmeos'],
  cancer: ['cancer', 'câncer'],
  leao: ['leao', 'leão'],
  virgem: ['virgem'],
  libra: ['libra'],
  escorpiao: ['escorpiao', 'escorpião'],
  sagitario: ['sagitario', 'sagitário'],
  capricornio: ['capricornio', 'capricórnio'],
  aquario: ['aquario', 'aquário'],
  peixes: ['peixes'],
};

// Função para detectar signos na pergunta
function detectarSignos(pergunta: string): string[] {
  const encontrados: string[] = [];
  const perguntaLower = pergunta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const [signo, variantes] of Object.entries(signosMap)) {
    for (const variante of variantes) {
      const varianteNorm = variante.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (perguntaLower.includes(varianteNorm)) {
        encontrados.push(signo);
        break;
      }
    }
  }
  return encontrados;
}

// Função para buscar horóscopo do Cafe Astrology
async function buscarCafeAstrology(signo: string) {
  const cafeSigno = cafeAstrologySignos[signo as keyof typeof cafeAstrologySignos];
  if (!cafeSigno) return null;
    const url = `https://cafeastrology.com/${cafeSigno}dailyhoroscope.html`;
    console.log('URL Cafe astrology:', url);
  try {
    const res = await fetch(url);
    const html = await res.text();
    // Regex para capturar o horóscopo do dia
    // const match = html.match(/<h2>Today's [\w\s]+ Horoscope from Cafe Astrology<\/h2>([\s\S]*?)<p><strong>/i);
    // const texto = match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
    let h2Index = 0;
    if (cafeSigno == 'aries')
        h2Index = html.indexOf("Today's Aries Horoscope from Cafe Astrology");
    else if (cafeSigno == 'taurus')
        h2Index = html.indexOf("Today's Taurus Horoscope from Cafe Astrology");
    else if (cafeSigno == 'gemini')
        h2Index = html.indexOf("Today's Gemini Horoscope from Cafe Astrology");
    else if (cafeSigno == 'cancer')
        h2Index = html.indexOf("Today's Cancer Horoscope from Cafe Astrology");
    else if (cafeSigno == 'leo')
        h2Index = html.indexOf("Today's Leo Horoscope from Cafe Astrology");
    else if (cafeSigno == 'virgo')
        h2Index = html.indexOf("Today's Virgo Horoscope from Cafe Astrology");
    else if (cafeSigno == 'libra')
        h2Index = html.indexOf("Today's Libra Horoscope from Cafe Astrology");
    else if (cafeSigno == 'scorpio')
        h2Index = html.indexOf("Today's Scorpio Horoscope from Cafe Astrology");
    else if (cafeSigno == 'sagittarius')
        h2Index = html.indexOf("Today's Sagittarius Horoscope from Cafe Astrology");
    else if (cafeSigno == 'capricorn')
        h2Index = html.indexOf("Today's Capricorn Horoscope from Cafe Astrology");
    else if (cafeSigno == 'aquarius')
        h2Index = html.indexOf("Today's Aquarius Horoscope from Cafe Astrology");
    else if (cafeSigno == 'pisces')
        h2Index = html.indexOf("Today's Pisces Horoscope from Cafe Astrology");

    let texto = '';
    if (h2Index !== -1) {
        const pMatch = html.slice(h2Index).match(/<p>(.*?)<\/p>/i);
        texto = pMatch ? pMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    }
    console.log('Cafe Astrology:', { cafeSigno, texto });
    if (texto) {
      return { cafeSigno, texto, link: url };
    }
  } catch (e) {
    // Ignora erros individuais
  }
  return null;
}

// Função para buscar horóscopo do Personare
async function buscarPersonare(signo: string) {
  const url = `https://www.personare.com.br/horoscopo-do-dia/${signo}`;
  console.log('URL Personare:', url);
  try {
    const res = await fetch(url);
    const html = await res.text();
    // const match = html.match(/<p class="Text__Paragraph.*?">(.*?)<\/p>/);
    // const texto = match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
    let h2Index = 0;
    if (signo == 'aries')
        h2Index = html.indexOf("Horóscopo de hoje para Áries");
    else if (signo == 'touro')
        h2Index = html.indexOf("Horóscopo de hoje para Touro");
    else if (signo == 'gemeos')
        h2Index = html.indexOf("Horóscopo de hoje para Gêmeos");
    else if (signo == 'cancer')
        h2Index = html.indexOf("Horóscopo de hoje para Câncer");
    else if (signo == 'leao')
        h2Index = html.indexOf("Horóscopo de hoje para Leão");
    else if (signo == 'virgem')
        h2Index = html.indexOf("Horóscopo de hoje para Virgem");
    else if (signo == 'libra')
        h2Index = html.indexOf("Horóscopo de hoje para Libra");
    else if (signo == 'escorpiao')
        h2Index = html.indexOf("Horóscopo de hoje para Escorpião");
    else if (signo == 'sagitario')
        h2Index = html.indexOf("Horóscopo de hoje para Sagitário");
    else if (signo == 'capricornio')
        h2Index = html.indexOf("Horóscopo de hoje para Capricórnio");
    else if (signo == 'aquario')
        h2Index = html.indexOf("Horóscopo de hoje para Aquário");
    else if (signo == 'peixes')
        h2Index = html.indexOf("Horóscopo de hoje para Peixes");

    let texto = '';
    if (h2Index !== -1) {
        const pMatch = html.slice(h2Index).match(/<p>(.*?)<\/p>/i);
        texto = pMatch ? pMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    }
    console.log('Personare:', { signo, texto });
    if (texto) {
      return { signo, texto, link: url };
    }
  } catch (e) {
    // Ignora erros individuais
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  // Buscar notícias recentes da BBC (exemplo usando RSS)
  const rssUrl = 'https://feeds.bbci.co.uk/portuguese/rss.xml';
  const rssRes = await fetch(rssUrl);
  const rssText = await rssRes.text();
  const items = Array.from(rssText.matchAll(/<item>([\s\S]*?)<\/item>/g)).map(match => {
    const title = match[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    const description = match[1].match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';
    const link = match[1].match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
    return { title, description, link };
  });
  const context = items.slice(0, 3).map(item =>
    `Título: ${item.title}\nDescrição: ${item.description}\nLink: ${item.link}`
  ).join('\n\n');

  // Detectar signos na pergunta
  const signosEncontrados = detectarSignos(question);

  // Buscar horóscopos na Personare e Cafe Astrology apenas dos signos mencionados
  const horoscoposPersonare: any[] = [];
  const horoscoposCafe: any[] = [];
  for (const signo of signosEncontrados) {
    const personare = await buscarPersonare(signo);
    if (personare) horoscoposPersonare.push(personare);

    const cafe = await buscarCafeAstrology(signo);
    if (cafe) horoscoposCafe.push(cafe);
  }  
  console.log('horoscoposPersonare:', horoscoposPersonare);
  const personareContext = (horoscoposPersonare ?? [])
  .filter(h => h && typeof h.signo === 'string')
  .map(h =>
    `Signo: ${h.signo.charAt(0).toUpperCase() + h.signo.slice(1)}\nHoróscopo do dia (Personare): ${h.texto}\nLink: ${h.link}`
  ).join('\n\n') || 'Nenhum horóscopo encontrado na Personare para o(s) signo(s) mencionado(s).';

  console.log('horoscoposCafe:', horoscoposCafe);
  const cafeContext = (horoscoposCafe ?? [])
  .filter(h => h && typeof h.cafeSigno === 'string')
  .map(h =>
    `Signo: ${h.cafeSigno.charAt(0).toUpperCase() + h.cafeSigno.slice(1)}\nHoróscopo do dia (Cafe Astrology): ${h.texto}\nLink: ${h.link}`
  ).join('\n\n') || 'Nenhum horóscopo encontrado no Cafe Astrology para o(s) signo(s) mencionado(s).';

  // Montar prompt para o modelo
//   Contexto extraído da BBC:
// ${context}

// Contexto extraído da Personare:
// ${personareContext}

console.log('personareContext:', personareContext);
console.log('cafeContext:', cafeContext);

  const prompt = `
Você é um agente de IA que responde perguntas sobre astrologia, astronomia, fatos históricos e notícias atuais, usando apenas fontes confiáveis. 
Responda em português do Brasil, citando apenas as informações do contexto abaixo e os links fornecidos.

Contexto extraído do Cafe Astrology:
${cafeContext}

Pergunta do usuário: ${question}

Responda de forma clara, cite os links usados e não invente informações fora do contexto acima.
`;

  // Chamar o modelo local via Ollama
  const ollamaRes = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral', // ou 'llama2', 'llama3', etc.
      messages: [
        { role: 'user', content: prompt }
      ],
      stream: false
    }),
  });

  const ollamaData = await ollamaRes.json();
  console.log('Resposta da Ollama:', ollamaData);
  const answer = ollamaData.message?.content || 'Não foi possível obter uma resposta.';

  return NextResponse.json({ answer });
}