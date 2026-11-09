from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/Plano_Desenvolvimento_Soft_Skills_Gabriel_Fiebig.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial', boldItalic='Arial-Bold')
navy = colors.HexColor('#000000')
teal = colors.HexColor('#000000')
gray = colors.HexColor('#555555')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyP', fontName='Arial', fontSize=10.2, leading=14.5, textColor=navy, spaceAfter=8))
styles.add(ParagraphStyle(name='SmallP', parent=styles['BodyP'], fontSize=9, leading=12, spaceAfter=5))
styles.add(ParagraphStyle(name='TitleP', fontName='Arial-Bold', fontSize=23, leading=27, textColor=navy, spaceAfter=12))
styles.add(ParagraphStyle(name='SectionP', fontName='Arial-Bold', fontSize=18, leading=23, textColor=navy, spaceAfter=13))
styles.add(ParagraphStyle(name='SubP', fontName='Arial-Bold', fontSize=11.5, leading=15, textColor=teal, spaceBefore=8, spaceAfter=6))
story=[]
def p(t, style='BodyP'):
    story.append(Paragraph(t, styles[style]))
def sub(t): p(t, 'SubP')
def page(t):
    story.append(PageBreak())
    p(t, 'SectionP')
def box(t):
    tab=Table([[Paragraph(t, styles['BodyP'])]], colWidths=[479])
    tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#F2F2F2')),('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#CCCCCC')),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
    story.append(tab)
    story.append(Spacer(1,8))

p('Plano de Desenvolvimento<br/>de Soft Skills', 'TitleP')
p('<b>Gabriel Kaíque Fiebig</b> | Matrícula: 200390<br/>Universidade de Passo Fundo (UPF)<br/>Curso: Análise e Desenvolvimento de Sistemas (ADS)<br/>Disciplina: Soft Skills | Professor: Roberto', 'SmallP')
p('<b>Horizonte do plano:</b> 90 dias a partir do início da aplicação.', 'SmallP')
sub('Contexto acadêmico e profissional')
p('Estou no último semestre de ADS na UPF e trabalho na Stara, no setor de Analytics e IA, onde atualmente sou referência técnica em inteligência artificial. Pretendo continuar na área de tecnologia e buscar uma especialização. Ainda estou definindo o foco, com interesse em dados e em caminhos ligados à engenharia ou à arquitetura.')
sub('1. Autoavaliação')
p('<b>Comunicação - nível médio.</b> Considero a comunicação um diferencial na minha atuação e realizo treinamentos sobre TI para pessoas de outras áreas. Porém, ainda preciso desenvolver a persuasão, principalmente diante de um público que não conheço. Explicar um assunto e construir argumentos para uma decisão são desafios diferentes para mim.')
p('<b>Proatividade - nível alto.</b> Nas mudanças de processos da empresa, procuro entender o contexto e sugerir melhorias além da atividade solicitada. Busco soluções que contribuam para o processo como um todo, em vez de encerrar minha participação apenas com a execução da demanda.')
p('<b>Pensamento crítico - nível alto.</b> Ao realizar tarefas, costumo questionar por que estou fazendo aquilo, qual problema estamos resolvendo e o que muda para o processo ou para o negócio. Não me satisfaço apenas com uma solução funcional; procuro compreender sua finalidade e contribuição.')
p('<b>Organização - nível alto no trabalho coletivo, com melhoria necessária na rotina pessoal.</b> Gosto de organizar ambientes compartilhados e estabelecer padrões de desenvolvimento, versionamento e produção. Entendo que a falta de padrões faz a equipe gastar tempo decidindo como trabalhar. Na vida pessoal, entretanto, às vezes esqueço compromissos por não me organizar.')
p('<b>Adaptabilidade - nível médio.</b> Trabalho em um setor novo, que já passou por muitas mudanças. Essa experiência me ensinou a não me apegar a ferramentas, desenvolvimentos ou processos e a buscar inovação. Minha dificuldade está em construir argumentos que sustentem a necessidade da mudança, tanto para outras pessoas quanto para minha própria decisão.')

page('2. Diagnóstico')
sub('Principais pontos fortes')
p('Meus pontos fortes são a proatividade, o pensamento crítico e a organização do trabalho coletivo. Procuro compreender o problema antes de executar uma tarefa, identificar oportunidades de melhoria e contribuir para padrões que facilitem o trabalho de outras pessoas. A experiência com treinamentos também demonstra uma base de comunicação que posso desenvolver.')
p('No trabalho, essas características favorecem minha contribuição como referência técnica em IA: ajudam a relacionar soluções ao contexto do negócio e a organizar a execução em equipe. Na vida acadêmica, podem apoiar a análise de problemas e a estruturação de atividades em grupo.')
sub('Principais pontos de melhoria')
p('<b>Organização pessoal.</b> Existe uma diferença entre o cuidado que tenho com o ambiente coletivo e o que aplico aos meus próprios afazeres. O esquecimento de compromissos mostra que preciso registrar e acompanhar melhor minha rotina. Esse problema pode prejudicar o cumprimento de responsabilidades e a continuidade dos estudos.')
p('<b>Comunicação persuasiva.</b> Preciso apresentar argumentos mais consistentes para apoiar decisões e demonstrar a necessidade de mudanças, especialmente com pessoas que ainda não conheço. Essa dificuldade pode limitar a adesão às melhorias que proponho, mesmo quando consigo explicar o conteúdo técnico.')
p('<b>Segurança para apoiar mudanças.</b> A dificuldade de justificar uma mudança também aparece no meu próprio convencimento. Desenvolver critérios e reunir evidências pode me ajudar a avaliar alternativas e comunicar melhor as razões de uma decisão.')
sub('Riscos de não evoluir')
p('Se eu não melhorar a organização pessoal, corro o risco de continuar esquecendo compromissos e perder o foco nas metas de formação e especialização. Se não desenvolver a argumentação, minhas propostas podem ter menor adesão, e decisões sobre mudanças podem se tornar mais difíceis.')
box('<b>Prioridades:</b> 1. Organização pessoal; 2. Comunicação persuasiva; 3. Proatividade com análise das entregas. A proatividade será aprimorada a partir de uma base que já considero forte. A adaptabilidade será trabalhada de forma complementar, por meio da análise e da comunicação das mudanças.')

page('3. Objetivos de desenvolvimento - SMART')
p('O prazo dos três objetivos será de 90 dias a partir do início do plano. As metas serão acompanhadas por registros de prática e revisões periódicas.')
sub('Objetivo 1 | Organizar minha rotina pessoal')
box('Ao longo de 90 dias, manter um planejamento dos próximos três dias, atualizado diariamente, para acompanhar meus afazeres e reduzir o esquecimento de compromissos. Nos últimos 30 dias, buscar não perder compromissos por falta de registro ou de consulta à agenda.')
p('<b>Específico:</b> centralizar compromissos, prazos e tarefas pessoais em uma agenda e uma lista de acompanhamento.<br/><b>Mensurável:</b> registrar os compromissos assim que forem assumidos; marcar a revisão diária como realizada ou não realizada; contar os compromissos esquecidos por falha de organização.<br/><b>Atingível:</b> utilizar até uma hora diária, conforme minha disponibilidade, incluindo planejamento, revisão e organização dos afazeres.<br/><b>Relevante:</b> diminuir esquecimentos e transformar minhas metas de desenvolvimento em atividades da rotina.<br/><b>Temporal:</b> avaliar os resultados aos 30, 60 e 90 dias, com atenção especial ao último mês.')
sub('Objetivo 2 | Melhorar minha comunicação persuasiva')
box('Durante 90 dias, praticar três conversas intencionais por semana, solicitar um feedback semanal e elaborar uma proposta estruturada por mês, apresentando problema, benefício, evidências e próximo passo.')
p('<b>Específico:</b> melhorar a escuta e a construção de argumentos, inclusive com pessoas que ainda não conheço.<br/><b>Mensurável:</b> registrar as três conversas e o pedido de feedback de cada semana, além de produzir três propostas ao longo do plano.<br/><b>Atingível:</b> dedicar 30 minutos diários à preparação, prática ou análise das conversas, aproveitando oportunidades reais da rotina.<br/><b>Relevante:</b> apoiar decisões e comunicar a necessidade de mudanças de forma clara e respeitosa.<br/><b>Temporal:</b> acompanhar semanalmente e comparar a qualidade dos argumentos e dos feedbacks ao final dos 90 dias.')
sub('Objetivo 3 | Aprimorar a proatividade nas entregas')
box('Durante 90 dias, registrar as entregas realizadas e consolidar semanalmente uma análise com pelo menos uma oportunidade de melhoria, explicando sua relação com o processo ou com o negócio.')
p('<b>Específico:</b> complementar as entregas com uma análise do que foi feito e do que pode melhorar.<br/><b>Mensurável:</b> manter registros nos dias com entregas e uma síntese por semana com ao menos uma oportunidade identificada.<br/><b>Atingível:</b> reservar 30 minutos diários para registro e análise, usando as próprias atividades como base.<br/><b>Relevante:</b> tornar minha contribuição mais clara e direcionar a iniciativa a problemas reais.<br/><b>Temporal:</b> revisar as sínteses aos 30, 60 e 90 dias.')

page('4. Plano de ação')
sub('Organização pessoal | Até 1 hora por dia')
p('<b>Ações práticas.</b> Escolher uma agenda e uma lista única de tarefas. Registrar compromissos assim que surgirem, com data e lembrete quando necessário. Planejar os próximos três dias e revisar esse horizonte diariamente. Ao encerrar o dia, conferir o que foi concluído, reagendar pendências e verificar os compromissos seguintes. Usar o tempo disponível também para organizar materiais e afazeres pessoais.')
p('<b>Frequência.</b> Registro a cada novo compromisso; planejamento e revisão diários; avaliação semanal das pendências e dos esquecimentos.')
p('<b>Recursos.</b> Agenda digital ou física, lembretes e uma lista de tarefas. A escolha da ferramenta deve facilitar o uso diário, sem exigir recursos pagos.')
p('<b>Indicadores.</b> Dias com revisão realizada; compromissos registrados; quantidade de compromissos esquecidos por falta de organização; pendências sem nova data definida.')
sub('Comunicação persuasiva | 30 minutos por dia')
p('<b>Ações práticas.</b> Preparar perguntas para compreender o contexto da outra pessoa. Praticar três conversas intencionais por semana, incluindo oportunidades com pessoas que ainda não conheço. Escutar antes de sugerir algo e relacionar os argumentos às necessidades apresentadas. Pedir feedback sobre clareza, escuta e consistência dos argumentos. Elaborar uma proposta mensal com problema, benefício, evidências disponíveis e próximo passo.')
p('<b>Frequência.</b> Preparação ou reflexão diária; três conversas e um pedido de feedback por semana; uma proposta estruturada por mês.')
p('<b>Recursos.</b> Roteiro de conversa, registro breve dos aprendizados e feedback de pessoas com quem eu interagir. Treinamentos e discussões de melhorias podem oferecer oportunidades de prática.')
p('<b>Indicadores.</b> Conversas realizadas; pedidos e retornos de feedback; presença dos quatro elementos nas propostas; dúvidas e objeções que consegui compreender e responder. A concordância do interlocutor, sozinha, não será tratada como prova de boa comunicação.')
sub('Proatividade | 30 minutos por dia')
p('<b>Ações práticas.</b> Registrar cada entrega de forma breve: o que foi solicitado, o que foi realizado, qual problema foi atendido e qual contribuição adicional identifiquei. Consolidar uma síntese semanal e selecionar ao menos uma oportunidade de melhoria. Quando pertinente, apresentar a análise junto à entrega ou ao alinhamento da atividade, respeitando as prioridades existentes.')
p('<b>Frequência.</b> Registro nos dias com entregas; análise e consolidação semanais.')
p('<b>Recursos.</b> Modelo simples de relatório, histórico das atividades e espaço de alinhamento com as pessoas envolvidas.')
p('<b>Indicadores.</b> Entregas registradas; sínteses semanais concluídas; oportunidades identificadas e justificadas; retorno recebido sobre as sugestões. Uma sugestão só será registrada como implementada se isso efetivamente ocorrer.')

page('5. Monitoramento e avaliação')
p('Manterei um registro único de acompanhamento, usando agenda, planilha ou documento simples. Para cada período, anotarei a ação planejada, o que realizei, a evidência disponível, a dificuldade encontrada e o ajuste necessário. As contagens começarão no início do plano, pois ainda não tenho uma linha de base registrada.')
sub('Acompanhamento diário e semanal')
p('Diariamente, verificarei o planejamento dos próximos três dias e registrarei as práticas e entregas do dia. Ao final de cada semana, compararei o realizado com as metas: revisões da rotina, três conversas intencionais, um pedido de feedback e uma síntese das entregas com uma oportunidade de melhoria. Se não cumprir uma ação, registrarei o motivo e ajustarei sua execução.')
sub('Reavaliações em 30, 60 e 90 dias')
p('<b>30 dias:</b> verificar se os registros estão sendo mantidos, contar esquecimentos e identificar dificuldades para incluir as práticas na rotina.<br/><b>60 dias:</b> comparar os períodos, observar a consistência da organização, revisar os feedbacks e avaliar a clareza das propostas e das análises de entregas.<br/><b>90 dias:</b> reavaliar as cinco habilidades como baixas, médias ou altas, justificando cada avaliação com evidências do período. Comparar os resultados com as metas e definir o que deve continuar no próximo ciclo.')
sub('Evidências de evolução')
p('Usarei os históricos da agenda e das revisões, o registro de esquecimentos, as anotações das conversas, os feedbacks recebidos, as três propostas mensais e as sínteses das entregas. A evolução será avaliada pela consistência dessas práticas e pela qualidade dos exemplos registrados.')
p('Na comunicação, observarei se consigo explicar o problema, apresentar benefícios com base nas evidências disponíveis e encaminhar um próximo passo. Na organização, verificarei se os compromissos passaram a ser registrados e consultados. Na proatividade, avaliarei se minhas sugestões estão relacionadas a necessidades concretas.')
sub('6. Reflexão final')
p('Meu principal aprendizado nesta atividade foi perceber que sou organizado para os outros, mas não aplico o mesmo cuidado a mim. Consigo dedicar atenção aos padrões e à organização do trabalho coletivo, enquanto minha rotina pessoal ainda apresenta falhas, como o esquecimento de compromissos.')
p('Antes, essa diferença não estava tão clara para mim. Percebi que preciso dar mais atenção às minhas próprias necessidades e metas. Aplicar essa atenção à minha rotina pode me ajudar a manter o foco e a acompanhar melhor os passos que dependem de mim.')
p('Acredito que este plano pode contribuir para alcançar meus objetivos profissionais, transformando intenções em metas e incluindo essas metas no dia a dia. Ainda estou decidindo minha especialização, mas desenvolver organização pessoal, comunicação e proatividade pode apoiar meu caminho na área de tecnologia, inclusive em futuras oportunidades ligadas a dados, engenharia ou arquitetura.')

def footer(c, doc):
    w,h=A4
    c.setStrokeColor(colors.HexColor('#CCCCCC'))
    c.line(48,42,w-48,42)
    c.setFont('Arial',8)
    c.setFillColor(gray)
    c.drawString(48,29,'Gabriel Kaíque Fiebig | Plano de Desenvolvimento de Soft Skills')
    c.drawRightString(w-48,29,str(doc.page))
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=40,bottomMargin=56,title='Plano de Desenvolvimento de Soft Skills',author='Gabriel Kaíque Fiebig')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
