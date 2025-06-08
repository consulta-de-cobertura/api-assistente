import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ATENÇÃO: Lembre-se que, para o seu caso de múltiplos vendedores,
// o código final será um pouco diferente para receber os dados de cada vendedor.
// Por enquanto, vamos usar este para fazer o deploy e o teste inicial.
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userQuery = body.query;

    if (!userQuery || typeof userQuery !== 'string') {
      return NextResponse.json({ error: 'A "query" é obrigatória.' }, { status: 400 });
    }

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: userQuery,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    const { data, error } = await supabase.rpc('match_questions', {
      query_embedding: queryEmbedding,
      match_threshold: 0.75,
      match_count: 1,
    });

    if (error) {
      console.error('Erro na busca do Supabase:', error);
      throw new Error('Falha ao buscar no banco de dados.');
    }

    if (data && data.length > 0) {
      return NextResponse.json({ answer: data[0].answer_text });
    } else {
      return NextResponse.json({ answer: 'Desculpe, não encontrei uma resposta para sua pergunta em minha base de conhecimento.' });
    }

  } catch (e: any) {
    console.error('Erro geral na API:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
