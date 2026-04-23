/**
 * Seeds Marcelo's 10 scripts (captured from the WhatsApp session, 2026-04-15).
 * Run with: npm run db:seed
 */
import { PrismaClient, Format } from "@prisma/client";

const prisma = new PrismaClient();

const SCRIPTS: Array<{
  slot: number;
  format: Format;
  titleHook: string;
  body: string;
  cta: string;
}> = [
  {
    slot: 1,
    format: "REEL",
    titleHook: "Arquiteto há 47 anos. 250 obras. O que eu aprendi.",
    body:
      "Em 1978, no segundo ano da faculdade de arquitetura no Mackenzie, iniciei meu estágio em projetos e obras. Em 1981, ao me formar, já estava trabalhando em escritórios de renome. Em todo esse tempo acumulei conhecimento suficiente para entender onde se origina a maioria dos erros comuns no processo construtivo. A partir desse conhecimento desenvolvi um sistema capaz de prever e evitar a maioria dos erros que causam prejuízos, atrasos e aborrecimentos. É necessário analisar cada proposta, cada orçamento e todos os projetos antes das decisões finais. Cada um desses itens deve conter condições suficientes e legais para que a obra seja executada sem intercorrências, paralisações e despesas não previstas.",
    cta: "Siga-me para a série completa sobre como evitar erros na obra.",
  },
  {
    slot: 2,
    format: "FEED",
    titleHook: "Saber avaliar propostas vale mais que preço.",
    body:
      "Em construção ou reforma é muito importante saber avaliar as propostas que se recebe. Profissionais e empresas adotam formatos de proposta com elementos sedutores para impressionar e atribuir valor aos serviços oferecidos. É necessário, portanto, saber distinguir em cada proposta o que se está oferecendo em termos práticos e se o conteúdo é adequado às necessidades reais.",
    cta: "Conheça o método no errozero.online.",
  },
  {
    slot: 3,
    format: "REEL",
    titleHook: "7 critérios para avaliar qualquer proposta de obra.",
    body:
      "A escolha da melhor proposta deve atender a critérios básicos: adequação ao que foi solicitado; clareza na descrição do que se vai entregar; obrigações de cada uma das partes; especificações técnicas; prazos; valor e forma de pagamento; prazo de validade da proposta. Nem sempre a melhor proposta é a de melhor preço — é preciso ter critérios para definir a melhor relação custo-benefício. Se a proposta escolhida tiver preço maior, negocie — mas nunca coloque o preço como critério principal.",
    cta: "No próximo vídeo: contratos.",
  },
  {
    slot: 4,
    format: "FEED",
    titleHook: "O contrato pode determinar o sucesso da sua obra.",
    body:
      "Contratos em construção ou reforma são os documentos que podem determinar o sucesso de uma obra. A seguir, no segundo vídeo da série, vou falar sobre o que os contratos devem conter e como podem garantir a qualidade, o cumprimento dos prazos e a segurança dos pagamentos.",
    cta: "Siga-me e assista aos vídeos para saber como evitar erros na obra.",
  },
  {
    slot: 5,
    format: "REEL",
    titleHook: "8 itens que todo contrato de obra precisa ter.",
    body:
      "Após mais de 45 anos e 250 trabalhos realizados, posso afirmar com segurança que qualquer falha em contrato será motivo para problemas na obra. Existem 8 itens essenciais: qualificação das partes; descrição detalhada do escopo; definição das etapas e prazos de cada uma; forma de pagamento com parcelas atreladas ao cumprimento de etapas, além de parcela final de retenção para verificação; garantias; penalidades para descumprimento de qualquer cláusula; responsabilidades documentadas e comprovadas; especificação do foro judicial competente.",
    cta: "Nos próximos vídeos: análise de orçamentos e projetos.",
  },
  {
    slot: 6,
    format: "FEED",
    titleHook: "O projeto é a base de tudo. Descubra por quê.",
    body:
      "O projeto tem importância fundamental no processo de construção ou reforma. Por norma deve ser elaborado em pleno acordo com as necessidades, gosto e orçamento de quem vai ocupar o espaço a ser produzido. Deve conter informações suficientes para execução da obra em desenhos, memoriais e cálculos.",
    cta: "No próximo vídeo: como analisar o projeto.",
  },
  {
    slot: 7,
    format: "REEL",
    titleHook: "4 itens imprescindíveis em qualquer projeto.",
    body:
      "Há 45 anos trabalhando com projetos e obras, cada vez mais entendo a importância de um projeto completo e bem elaborado para determinar a qualidade, funcionalidade e andamento da obra. O projeto é composto por quatro itens imprescindíveis: desenhos de plantas, cortes e vistas; desenhos de detalhes construtivos; memorial descritivo com todas as especificações técnicas, marcas, modelos, acabamentos e cores; assistência à obra para explicações aos empreiteiros e contratados. É também muito importante que todos os itens do projeto tenham seus custos totais que resultem em uma estimativa de custo compatível com o orçamento disponível.",
    cta: "Siga-me para a próxima etapa da série.",
  },
  {
    slot: 8,
    format: "FEED",
    titleHook: "Planejamento e controle: o item fundamental.",
    body:
      "Obras de qualquer tamanho exigem planejamento e controle como itens fundamentais para a sua realização total. Deve haver um cronograma que prevê todas as despesas e a ordem em que serão efetuadas ao longo do prazo total da obra. Controle de cotações, contratos, fluxo de caixa e acompanhamento de serviços no cronograma é de extrema importância para manter a obra saudável.",
    cta: "No próximo vídeo: o sistema Obra Prima, cortesia Erro Zero.",
  },
  {
    slot: 9,
    format: "FEED",
    titleHook: "Obra Prima: controle total da sua obra.",
    body:
      "Ao se cadastrar na plataforma Erro Zero, você encontra o sistema Obra Prima, que proporciona o controle total da sua obra. Temos fornecedores cadastrados para sugestão de cotações e serviços, com panorama geral simplificado em relatórios resumidos. Você poderá também incluir fornecedores de sua escolha — os que estão cadastrados não têm nenhum tipo de vínculo conosco. Ao inserir o cronograma, a plataforma emite alertas durante a obra sobre qualquer situação não prevista, a tempo de realizar ajustes e manter a obra no curso e nos custos estimados.",
    cta: "Cadastre-se em errozero.online.",
  },
  {
    slot: 10,
    format: "REEL",
    titleHook: "Eu ao seu lado em cada decisão da obra.",
    body:
      "Em 47 anos observei cada cliente e fui entendendo que o discurso e o tratamento para cada um é muito diferente. Encontrar uma característica comum é praticamente impossível. A forma de apresentar algum serviço, usando uma dialética eficiente e convincente, é criar autoridade, demonstrar conhecimento e gerar respeito. Você só vai contratar o sistema se achar que terá segurança. A ideia é fazer com que você entenda que EU estarei ao seu lado a cada decisão. Os erros surgem quando se escolhe uma proposta errada, se assina um contrato com falhas, se recebe um projeto incompleto. Você submeterá cada documento à análise do sistema que emitirá um relatório, sugerindo a melhor opção, os ajustes necessários, as garantias e a segurança.",
    cta: "Entre em errozero.online e tenha Erro Zero ao seu lado.",
  },
];

async function main() {
  const email = process.env.ALLOWED_LOGIN_EMAIL ?? "marcelo@errozero.online";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Marcelo Guetta",
      preferredHoursIG: [12, 19, 21],
      preferredHoursFB: [9, 15, 20],
    },
  });

  for (const s of SCRIPTS) {
    await prisma.script.upsert({
      where: { userId_slot: { userId: user.id, slot: s.slot } },
      update: {
        format: s.format,
        titleHook: s.titleHook,
        body: s.body,
        cta: s.cta,
      },
      create: {
        userId: user.id,
        slot: s.slot,
        format: s.format,
        titleHook: s.titleHook,
        body: s.body,
        cta: s.cta,
      },
    });
  }

  console.log(`[seed] User ${user.email} + ${SCRIPTS.length} scripts upserted.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
