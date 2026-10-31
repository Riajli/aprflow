/* APRFlow · editor da APR / PT
   Abas, regras, assinaturas e documento. Os dados são gravados no Supabase pelo api.js. */

/* ---------- Ícones ---------- */
const IC = {
  icamento:'<path d="M3 4h18"/><path d="M12 4v5"/><path d="M12 9c1.7 0 2.5 1 2.5 2.2S13.6 13 12 13"/><path d="M8 15l4-2 4 2"/><rect x="6" y="15" width="12" height="6" rx="1"/>',
  obra:'<path d="M3 18h18"/><path d="M5 18a7 7 0 0 1 14 0"/><path d="M10 11V7.5h4V11"/><path d="M12 7.5V5"/>',
  inflam:'<path d="M12 3l9.5 17h-19z"/><path d="M12 9.5c1.6 1.4 2.6 2.8 2.6 4.4a2.6 2.6 0 0 1-5.2 0c0-1 .5-1.9 1.2-2.6.2.8.6 1.3 1.1 1.5-.2-1.3 0-2.3.3-3.3z"/>',
  altura:'<circle cx="12" cy="6" r="2"/><path d="M12 8v6M8.5 10.5h7M12 14l-3 6M12 14l3 6"/><path d="M12 4V1.5"/><path d="M3 22h4M17 22h4" stroke-dasharray="1.5 2"/>',
  energ:'<path d="M12 3l9.5 17h-19z"/><path d="M13 8.5l-3 5h4l-3 4.5"/>',
  prox:'<circle cx="12" cy="12" r="9.5" stroke-dasharray="2.2 2.6"/><path d="M13.2 5.5l-4.2 7h5l-3.2 6"/>',
  quente:'<path d="M3.5 20.5l7.5-7.5"/><path d="M11 13l3.5-3.5 2.2 2.2L13.2 15.2z"/><path d="M18 3.5v2.3M21 7h-2.3M20.2 4.4l-1.6 1.6M15.7 3.2l.6 1.6M21.3 9.8l-1.6-.5"/>',
  confinado:'<ellipse cx="12" cy="6" rx="8" ry="2.8"/><path d="M4 6v12c0 1.6 3.6 2.9 8 2.9s8-1.3 8-2.9V6"/><path d="M10 10v8M14 10v8M10 12.5h4M10 15.5h4"/>',
  escav:'<path d="M2.5 21h19"/><path d="M5 21l2.5-6h9l2.5 6"/><path d="M15 3.5l-3.5 9.5"/><path d="M13.5 2.8l3.3 1.4"/>',
  clima:'<path d="M7 16.5a4 4 0 1 1 .9-7.9 5 5 0 0 1 9.6 1A3.5 3.5 0 0 1 17 16.5"/><path d="M12.5 12l-2 4h3l-2 4"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

/* ---------- Bibliotecas (genéricas, configuráveis por cliente no sistema final) ---------- */
const ATIV = [
 {id:'a01',perg:'A Permissão de Içamento está emitida e aprovada?',orient:'Confira se a Permissão de Içamento (plano de içamento) foi preenchida, analisada e aprovada, se o operador é habilitado e se os acessórios de içamento foram inspecionados. Informe o número da permissão no campo da atividade 01.',seNao:'A atividade não pode ser iniciada.',reqDup:[0],cond:'Operações de içamento',n:'01',icon:'icamento',nome:'Movimentação de cargas com guinchos, guindastes ou plataformas',tipo:'permissao',doc:'Permissão de Içamento',
  regra:'Com carga suspensa, a atividade só pode começar após o preenchimento, análise e aprovação da Permissão de Içamento (plano de içamento). Sem ela, a atividade não pode ser executada.',
  req:['Permissão de Içamento emitida e aprovada','Operador habilitado e acessórios de içamento inspecionados'],riscos:['r_obj','r_esmag','r_atrop']},
 {id:'a02',n:'02',icon:'obra',nome:'Construção civil',tipo:'controle',
  regra:'Seguir o PGR da obra e manter circulação e proteções coletivas da frente de trabalho conforme a NR-18.',
  req:['Proteções coletivas da frente de trabalho instaladas'],riscos:['r_obj','r_mesmo','r_poeira','r_corte']},
 {id:'a03',perg:'A medição de inflamáveis está dentro do limite definido pela empresa?',orient:'Meça a atmosfera no local imediatamente antes do início, com detector calibrado, e confirme que as fontes de ignição estão controladas.',seNao:'A atividade não pode ser iniciada. Ventile, elimine a fonte e repita a medição.',reqDup:[0],cond:'Atmosfera inflamável ou explosiva',n:'03',icon:'inflam',nome:'Gases, explosivos e/ou líquidos inflamáveis',tipo:'impeditiva',
  regra:'Medir a atmosfera antes do início. Com leitura de inflamáveis acima do limite definido pela empresa, a atividade é impeditiva e não pode ser iniciada.',
  req:['Medição de inflamáveis realizada e dentro do limite','Fontes de ignição controladas'],riscos:['r_incendio','r_quimico']},
 {id:'a04',n:'04',icon:'altura',nome:'Trabalho em altura e/ou sobre telhado',tipo:'controle',trein:'nr35',
  regra:'Trabalho acima de 2 m com risco de queda. Exige trabalhadores capacitados em NR-35, aptos no ASO, sistema de proteção contra quedas e plano de resgate.',
  req:['Sistema de proteção contra quedas e ancoragem inspecionados','Plano de resgate definido e equipamento de resgate no local'],riscos:['r_altura','r_obj','r_escada','r_telhado']},
 {id:'a05',perg:'A desenergização ou a distância mínima de segurança está garantida?',orient:'Confirme se o circuito foi desenergizado, bloqueado, etiquetado e teve a ausência de tensão constatada com detector, ou se a distância mínima de segurança prevista nas normas pode ser mantida durante toda a atividade.',seNao:'A atividade não pode ser iniciada ou deve ser suspensa imediatamente.',reqDup:[0],rk:['r_choque','r_arco'],cond:'Circuitos ou superfícies energizadas',n:'05',icon:'energ',nome:'Constatação de circuito ou superfície energizada',tipo:'impeditiva',trein:'nr10',
  regra:'Manter o distanciamento mínimo de segurança previsto nas normas. Se não for possível garantir essa distância ou a desenergização, a atividade é impeditiva e deve ser suspensa imediatamente.',
  req:['Circuito desenergizado, bloqueado e etiquetado, ou distância de segurança garantida','Ausência de tensão constatada com detector'],riscos:['r_choque','r_arco']},
 {id:'a06',n:'06',icon:'prox',nome:'Trabalho próximo a área energizada',tipo:'controle',trein:'nr10',
  regra:'Delimitar zona controlada e zona de risco. Só trabalhadores autorizados em NR-10 atuam na zona controlada.',
  req:['Zona de risco delimitada e sinalizada'],riscos:['r_choque','r_arco']},
 {id:'a07',n:'07',icon:'quente',nome:'Trabalho a quente',tipo:'controle',
  regra:'Solda, corte ou esmerilhamento. Remover ou proteger combustíveis no entorno e manter extintor e observador de fogo durante e após o trabalho.',
  req:['Combustíveis removidos ou protegidos no entorno','Extintor no local e observador de fogo designado'],riscos:['r_incendio','r_queim','r_fumos','r_particulas','r_radiacao']},
 {id:'a08',perg:'A Permissão de Entrada e Trabalho (PET) está emitida e liberada?',orient:'Confira se a PET (NR-33) foi preenchida, analisada e liberada pelo supervisor de entrada, com atmosfera avaliada e vigia designado. Informe o número da PET no campo da atividade 08.',seNao:'A entrada no espaço confinado e a atividade não podem ser realizadas.',reqDup:[0],rk:['r_atmosfera','r_confinado'],cond:'Trabalho em espaço confinado',n:'08',icon:'confinado',nome:'Espaço confinado',tipo:'permissao',doc:'Permissão de Entrada e Trabalho (PET)',trein:'nr33',
  regra:'É obrigatório preencher, analisar e liberar a Permissão de Entrada e Trabalho (PET – NR-33). Sem a emissão e autorização dessa permissão, a atividade não pode ser executada.',
  req:['PET emitida e liberada pelo supervisor de entrada','Atmosfera avaliada e vigia designado'],riscos:['r_confinado','r_atmosfera','r_quimico']},
 {id:'a09',n:'09',icon:'escav',nome:'Demolição e escavações',tipo:'controle',
  regra:'Verificar interferências subterrâneas antes de escavar. Escorar ou taludar conforme profundidade e tipo de solo, e isolar a borda da vala.',
  req:['Interferências subterrâneas verificadas','Escoramento ou taludamento executado'],riscos:['r_soterr','r_obj','r_mesmo']},
 {id:'a10',perg:'As condições climáticas estão adequadas, sem chuva, ventos fortes ou formação de raios?',orient:'Verifique o tempo no local no momento da liberação e acompanhe durante o trabalho. Trabalho em altura a céu aberto, atividades próximas a rede energizada e içamento de cargas exigem condições adequadas.',seNao:'Essas atividades ficam proibidas e devem ser suspensas. Retome só após nova verificação.',reqDup:[0],rk:['r_clima'],cond:'Chuva, ventos fortes ou formação de raios',n:'10',icon:'clima',nome:'Intempéries climáticas',tipo:'impeditiva',
  regra:'Com chuva, ventos fortes ou formação de raios, ficam proibidos trabalho em altura a céu aberto, atividades próximas a rede energizada e içamento de cargas. Retomar só após nova verificação.',
  req:['Condições climáticas verificadas no momento da liberação'],riscos:['r_clima']}
];
const TIPO = {impeditiva:'Condição impeditiva',permissao:'Exige permissão complementar',controle:'Requisito de controle'};
const TREIN = {nr35:'NR-35',nr10:'NR-10',nr33:'NR-33'};

const RISCOS = [
 ['r_atrop', 'Atropelamento / tráfego de veículos'],['r_transito', 'Acidente de trânsito'],
 ['r_furto', 'Furtos e roubos (assalto)'],['r_altura', 'Queda de pessoa com diferença de nível'],
 ['r_mesmo', 'Queda de mesmo nível'],['r_escada', 'Queda de escada'],
 ['r_telhado', 'Trabalho sobre telhado ou forro frágil'],['r_obj', 'Queda de objetos ou materiais'],
 ['r_batida', 'Batida contra'],['r_choque', 'Choque elétrico'],
 ['r_arco', 'Arco elétrico'],['r_incendio', 'Incêndio ou explosão'],
 ['r_queim', 'Queimaduras'],['r_atmosfera', 'Atmosfera perigosa (falta de O₂, gases tóxicos)'],
 ['r_quimico', 'Exposição a produtos químicos'],['r_poeira', 'Exposição a poeiras'],
 ['r_fumos', 'Exposição a fumos metálicos'],['r_ruido', 'Ruído excessivo'],
 ['r_vibra', 'Vibração'],['r_radiacao', 'Radiação não ionizante (solda)'],
 ['r_calor', 'Exposição à radiação solar'],['r_peso', 'Levantamento e transporte manual de peso'],
 ['r_postura', 'Postura inadequada'],['r_corte', 'Cortes e perfurações'],
 ['r_esmag', 'Prensamento ou esmagamento'],['r_particulas', 'Projeção de partículas'],
 ['r_soterr', 'Soterramento ou desmoronamento'],['r_clima', 'Chuva, vento forte ou raios'],
 ['r_animais', 'Animais peçonhentos e insetos'],['r_agua', 'Exposição a água suja'],
 ['r_umid', 'Exposição a umidade'],['r_confinado', 'Trabalhos em espaços confinados']
];
const MEDIDAS = [
 ['m_isolar', 'Sinalizar e isolar a área'],['m_inspfer', 'Inspecionar ferramentas e equipamentos antes do uso'],
 ['m_inspepi', 'Inspecionar cinto, talabarte e trava-queda'],['m_ancor', 'Instalar linha de vida ou ponto de ancoragem'],
 ['m_escada', 'Usar escada em bom estado, apoiada e amarrada'],['m_resgate', 'Manter plano e equipamento de resgate no local'],
 ['m_amarrar', 'Amarrar ferramentas e usar bolsa porta-ferramentas'],['m_loto', 'Desenergizar, bloquear e etiquetar (LOTO)'],
 ['m_tensao', 'Testar ausência de tensão com detector ou multiteste'],['m_dist', 'Manter distância de segurança de partes energizadas'],
 ['m_isoladas', 'Usar ferramentas isoladas'],['m_gas', 'Medir atmosfera (O₂, inflamáveis, tóxicos)'],
 ['m_ventilar', 'Ventilar ou exaurir o ambiente'],['m_combust', 'Remover ou proteger materiais combustíveis'],
 ['m_extintor', 'Manter extintor adequado no local'],['m_vigia', 'Designar observador de fogo ou vigia'],
 ['m_fispq', 'Consultar a FISPQ dos produtos químicos'],['m_escorar', 'Escorar ou taludar a escavação'],
 ['m_interf', 'Verificar interferências subterrâneas'],['m_clima', 'Acompanhar as condições climáticas'],
 ['m_animais', 'Inspecionar o local quanto a animais peçonhentos'],['m_rota', 'Manter rota de fuga desobstruída'],
 ['m_ergo', 'Revezar tarefas, usar auxílio mecânico e fazer pausas'],['m_hidrat', 'Hidratação e pausas em local fresco'],
 ['m_transito', 'Usar colete refletivo e sinalizar o tráfego'],['m_limpeza', 'Manter ordem e limpeza e ter atenção às sinalizações do local'],
 ['m_protmaq', 'Manter proteções de máquinas e partes móveis'],['m_radio', 'Manter comunicação entre a equipe (rádio)'],
 ['m_dirigir', 'Usar cinto de segurança e respeitar as regras de trânsito'],['m_cnh', 'Condutor habilitado e veículo em boas condições'],
 ['m_valores', 'Evitar a exposição de equipamentos e valores'],['m_dupla', 'Trabalhar em dupla em locais de risco de assalto'],
 ['m_circ', 'Atenção à circulação e sinalização de obstáculos'],['m_segescada', 'Um trabalhador segura a escada durante a atividade'],
 ['m_auric', 'Utilizar os protetores auriculares'],['m_isolinc', 'Isolar o local e ter atenção quanto a riscos de incêndio'],
 ['m_orient', 'Seguir a orientação da área de segurança'],['m_umid', 'Utilizar os equipamentos informados e esvaziar o local'],
 ['m_pet', 'Emitir a PET e utilizar os equipamentos de segurança']
];
const EPI = [
 ['e_capacete', 'Capacete com jugular'],['e_oculos', 'Óculos de segurança incolor'],['e_oculoesc', 'Óculos de segurança escuro'],
 ['e_facial', 'Protetor facial'],['e_mascsolda', 'Máscara de solda'],['e_plug', 'Protetor auditivo tipo plug'],
 ['e_concha', 'Protetor auditivo tipo concha'],['e_pff2', 'Respirador PFF2'],['e_respquim', 'Respirador com filtro químico'],
 ['e_luvavaq', 'Luva de vaqueta'],['e_luvamec', 'Luva contra agentes mecânicos'],['e_luvaiso', 'Luva isolante para eletricidade'],
 ['e_luvanitr', 'Luva nitrílica ou PVC'],['e_luvavib', 'Luva antivibração'],['e_raspa', 'Luva de raspa'],
 ['e_calcado', 'Calçado de segurança'],['e_calcele', 'Calçado para eletricista'],['e_cinto', 'Cinto tipo paraquedista'],
 ['e_talY', 'Talabarte duplo (Y) com absorvedor'],['e_talpos', 'Talabarte de posicionamento'],['e_trava', 'Trava-queda'],
 ['e_atpv', 'Vestimenta antichama (ATPV)'],['e_avental', 'Avental de raspa'],['e_perneira', 'Perneira'],
 ['e_capa', 'Capa de chuva'],['e_solar', 'Protetor solar'],['e_colete', 'Colete refletivo'],
 ['e_luvaseg', 'Luva de segurança'],['e_luvacob', 'Luva de cobertura'],['e_botapvc', 'Bota de segurança - PVC']
];
const EPC = [
 ['c_cones', 'Cones e fitas de sinalização'],['c_placas', 'Placas de advertência'],['c_extintor', 'Extintor de incêndio'],
 ['c_detector', 'Detector de tensão / multiteste'],['c_bloqueio', 'Kit de bloqueio (cadeados e etiquetas)'],['c_multigas', 'Detector multigás'],
 ['c_ventilador', 'Ventilador ou exaustor'],['c_linha', 'Linha de vida'],['c_escada', 'Escada / nivelador de escada'],
 ['c_andaime', 'Andaime'],['c_pta', 'Plataforma de trabalho aéreo (PTA)'],['c_escoramento', 'Escoramento'],
 ['c_manta', 'Manta antichama'],['c_biombo', 'Biombo de solda'],['c_tripe', 'Sistema de resgate'],
 ['c_ilum', 'Iluminação auxiliar'],['c_radio', 'Rádio comunicador'],['c_socorro', 'Kit de primeiros socorros'],
 ['c_maca', 'Maca e prancha rígida'],['c_linhamovel', 'Linha de vida móvel'],['c_telcorp', 'Telefone corporativo'],
 ['c_resgate', 'Kit de resgate em altura']
];
/* Itens retirados do catálogo: continuam nos documentos antigos que os usaram, mas não aparecem para novos */
const OCULTOS = new Set(['c_resgate']);
/* risco -> medidas (m), EPI (e) e EPC (c) sugeridos */
const SUG = {
 r_atrop:{m:['m_transito', 'm_isolar'],e:['e_colete'],c:['c_cones']},
 r_transito:{m:['m_dirigir', 'm_cnh']},
 r_furto:{m:['m_valores', 'm_dupla'],c:['c_telcorp']},
 r_altura:{m:['m_inspepi', 'm_ancor', 'm_resgate', 'm_isolar'],e:['e_cinto', 'e_talY', 'e_talpos', 'e_trava', 'e_capacete', 'e_luvaseg', 'e_oculos', 'e_calcado'],c:['c_linha', 'c_tripe', 'c_pta', 'c_escada']},
 r_mesmo:{m:['m_limpeza'],e:['e_calcado']},
 r_escada:{m:['m_escada', 'm_segescada'],e:['e_cinto', 'e_talY', 'e_talpos', 'e_trava', 'e_capacete', 'e_luvaseg', 'e_oculos', 'e_calcado'],c:['c_linha', 'c_tripe', 'c_pta', 'c_escada']},
 r_telhado:{m:['m_ancor', 'm_inspepi'],e:['e_cinto', 'e_talY', 'e_talpos', 'e_trava', 'e_capacete', 'e_luvaseg', 'e_oculos', 'e_calcado'],c:['c_linha', 'c_tripe', 'c_pta', 'c_escada']},
 r_obj:{m:['m_isolar', 'm_amarrar'],e:['e_capacete', 'e_calcado'],c:['c_cones']},
 r_batida:{m:['m_circ', 'm_limpeza'],e:['e_capacete', 'e_calcado', 'e_luvaseg']},
 r_choque:{m:['m_loto', 'm_tensao', 'm_dist', 'm_isoladas'],e:['e_luvaiso', 'e_calcele', 'e_atpv'],c:['c_detector', 'c_bloqueio']},
 r_arco:{m:['m_loto', 'm_dist'],e:['e_atpv', 'e_facial'],c:['c_bloqueio']},
 r_incendio:{m:['m_combust', 'm_extintor', 'm_vigia', 'm_gas'],c:['c_extintor', 'c_manta', 'c_multigas']},
 r_queim:{m:['m_combust'],e:['e_raspa', 'e_avental'],c:['c_manta']},
 r_atmosfera:{m:['m_gas', 'm_ventilar', 'm_vigia', 'm_resgate'],e:['e_respquim', 'e_capacete', 'e_calcado', 'e_luvaseg'],c:['c_multigas', 'c_ventilador', 'c_tripe']},
 r_quimico:{m:['m_fispq', 'm_ventilar'],e:['e_luvanitr', 'e_respquim', 'e_oculos']},
 r_poeira:{m:['m_ventilar'],e:['e_pff2', 'e_oculos']},
 r_fumos:{m:['m_ventilar'],e:['e_pff2', 'e_mascsolda'],c:['c_biombo']},
 r_ruido:{m:['m_auric'],e:['e_plug', 'e_concha']},
 r_vibra:{m:['m_ergo'],e:['e_luvavib']},
 r_radiacao:{m:['m_isolinc'],e:['e_oculoesc', 'e_mascsolda'],c:['c_biombo', 'c_extintor']},
 r_calor:{m:['m_hidrat'],e:['e_solar', 'e_oculoesc']},
 r_peso:{m:['m_ergo']},
 r_postura:{m:['m_ergo']},
 r_corte:{m:['m_inspfer'],e:['e_luvamec', 'e_oculos']},
 r_esmag:{m:['m_protmaq', 'm_isolar'],e:['e_luvamec', 'e_calcado']},
 r_particulas:{m:['m_orient'],e:['e_oculos', 'e_facial'],c:['c_biombo']},
 r_soterr:{m:['m_escorar', 'm_interf', 'm_isolar'],e:['e_capacete', 'e_calcado', 'e_oculos'],c:['c_escoramento']},
 r_clima:{m:['m_clima'],e:['e_capa']},
 r_animais:{m:['m_animais'],e:['e_perneira', 'e_luvavaq']},
 r_agua:{m:['m_umid'],e:['e_luvanitr', 'e_botapvc', 'e_oculos']},
 r_umid:{m:['m_umid'],e:['e_luvanitr', 'e_botapvc', 'e_oculos']},
 r_confinado:{m:['m_pet'],e:['e_capacete', 'e_luvaseg', 'e_calcado', 'e_oculos'],c:['c_cones', 'c_placas', 'c_multigas', 'c_ventilador', 'c_escada', 'c_tripe', 'c_ilum', 'c_radio']}
};
/* Verificações gerais de condição impeditiva: [chave, pergunta, orientação, se "Não"] */
const IMP_GERAIS = [
 ['gi_trein','Todos os trabalhadores têm treinamento e ASO válidos para a atividade?','Confira se cada executante tem os treinamentos exigidos (NR-35, NR-10, NR-33, conforme as atividades marcadas) dentro da validade e ASO apto para a função.','O trabalhador sem treinamento ou ASO válido não pode executar a atividade.'],
 ['gi_epi','EPI, EPC e ferramentas estão disponíveis e em bom estado?','Confira se todos os equipamentos previstos nesta APR estão no local, inspecionados, sem danos e em uso correto pela equipe.','A atividade não pode ser iniciada até a substituição ou correção.'],
 ['gi_mud','O local e a tarefa estão iguais ao previsto nesta APR?','Confirme se o local, o método de trabalho, a equipe e as condições do ambiente são os mesmos considerados na análise de riscos.','A APR perde o efeito. Interrompa e emita um novo documento.']
];
const GERAIS = [
 ['g_dds','APR lida e explicada à equipe no local (DDS)'],['g_local','Condições do local conferidas pelo liberador'],
 ['g_ferr','Ferramentas e equipamentos inspecionados'],['g_epi','EPIs conferidos e em uso pela equipe']
];
const ENC = [
 ['x_serv','Serviço concluído, ou interrompido com o motivo registrado'],['x_area','Área limpa, organizada e devolvida'],
 ['x_ferr','Ferramentas e materiais recolhidos'],['x_bloq','Bloqueios, isolamentos e sinalizações removidos'],
 ['x_equipe','Toda a equipe fora da área de risco']
];
const DECLARACAO = [
 'Esta Análise Preliminar de Riscos (APR) subsidia a liberação do início das atividades e é válida exclusivamente para os trabalhadores nela relacionados e para a atividade aqui descrita. Havendo inclusão de novos trabalhadores ou execução de atividades distintas, o documento deve ser revisado, atualizado e reemitido.',
 'Além das medidas previstas nesta APR, se após o início das atividades forem identificados novos riscos ou alterações nas condições de trabalho, devem ser adotadas medidas adicionais de controle, registradas neste documento, desde que não alterem a natureza da atividade.',
 'Os trabalhadores relacionados devem cumprir as normas de segurança aplicáveis, os procedimentos internos, as ordens de serviço e as instruções recebidas nos treinamentos para os quais foram capacitados e autorizados pela empresa.',
 'Ocorrendo evento não previsto, risco não avaliado nesta análise, condição impeditiva, alteração da equipe, do local ou do método de trabalho, ou término da validade, esta Análise Preliminar de Riscos e a respectiva Permissão de Trabalho perdem o efeito imediatamente. A atividade deve ser interrompida e só poderá ser retomada após a emissão de um novo documento.'
];
const P_LBL = ['','Improvável','Pouco provável','Provável','Muito provável'];
const S_LBL = ['','Leve','Moderada','Grave','Gravíssima'];
const TABS = [['ident','Identificação'],['riscos','Riscos'],['ativ','Atividades críticas'],['medidas','Medidas e EPI'],['equipe','Equipe'],['emerg','Emergência'],['lib','Liberação da PT'],['enc','Encerramento'],['doc','Documento']];
const PLANOS = [
 'Em caso de emergência, acionar um dos telefones de emergência listados.',
 'Para o resgate da vítima, um trabalhador deve permanecer no local até a chegada dos bombeiros ou socorristas.',
 'Manter desobstruído o acesso ao local de trabalho para a chegada do socorro.',
 'Para o resgate, utilizar maca e prancha rígida conforme o procedimento adequado.'
];

/* ---------- Estado ---------- */
const KEY = 'aprflow';
/* CPF 000.000.000-00 · CNPJ XX.XXX.XXX/XXXX-XX (aceita o CNPJ alfanumérico da Receita Federal) */
function maskCPF(v){ const d=String(v).replace(/\D/g,'').slice(0,11);
  return d.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/,'.$1-$2'); }
function maskCNPJ(v){ let c=String(v).toUpperCase().replace(/[^0-9A-Z]/g,'');
  c=c.slice(0,12)+c.slice(12).replace(/\D/g,''); c=c.slice(0,14);
  const p=[c.slice(0,2),c.slice(2,5),c.slice(5,8),c.slice(8,12),c.slice(12,14)];
  let o=p[0]; if(p[1]) o+='.'+p[1]; if(p[2]) o+='.'+p[2]; if(p[3]) o+='/'+p[3]; if(p[4]) o+='-'+p[4]; return o; }
function cpfOk(v){ const d=String(v).replace(/\D/g,''); if(d.length!==11||/^(\d)\1+$/.test(d)) return false;
  for(let t=9;t<11;t++){ let s=0; for(let i=0;i<t;i++) s+=+d[i]*(t+1-i); const dv=(s*10)%11%10; if(dv!==+d[t]) return false; } return true; }
function cnpjOk(v){ const c=String(v).toUpperCase().replace(/[^0-9A-Z]/g,''); if(!/^[0-9A-Z]{12}\d{2}$/.test(c)||/^(.)\1+$/.test(c)) return false;
  const val=ch=>ch.charCodeAt(0)-48, w1=[5,4,3,2,9,8,7,6,5,4,3,2], w2=[6,...w1];
  const dv=(n,w)=>{ const r=w.reduce((s,x,i)=>s+val(c[i])*x,0)%11; return r<2?0:11-r; };
  return dv(12,w1)===+c[12] && dv(13,w2)===+c[13]; }
const maskCEP = v => String(v).replace(/\D/g,'').slice(0,8).replace(/^(\d{5})(\d)/,'$1-$2');
const END0 = () => ({cep:'',log:'',num:'',comp:'',bairro:'',cidade:'',uf:''});
const tx = v => (v==null?'':String(v)).trim();
function fmtEnd(a,comp=true){ if(!a) return ''; let l1=[tx(a.log),tx(a.num)].filter(Boolean).join(', '); if(comp&&tx(a.comp)) l1+=` – ${tx(a.comp)}`;
  const cu=[tx(a.cidade),tx(a.uf)].filter(Boolean).join(' - '); return [l1,tx(a.bairro),cu,tx(a.cep)].filter(Boolean).join(', '); }
const MASK = {cep:{fmt:maskCEP,ok:v=>String(v).replace(/\D/g,'').length===8,len:9,msg:'CEP incompleto'},cpf:{fmt:maskCPF,ok:cpfOk,len:14,msg:'CPF inválido'},cnpj:{fmt:maskCNPJ,ok:cnpjOk,len:18,msg:'CNPJ inválido'}};
const pad = n => String(n).padStart(2,'0');
const hoje = (d=new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const agoraLocal = (d=new Date()) => `${hoje(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtData = s => { if(!s) return '—'; const [y,m,d]=s.slice(0,10).split('-'); return `${d}/${m}/${y}`; };
/* Datas e horas sempre no horário de Brasília, qualquer que seja o fuso do aparelho */
const TZ = 'America/Sao_Paulo';
const FMT_DH = new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const fmtDH = s => { if(!s) return '—'; const d=new Date(s); return isNaN(d) ? '—' : FMT_DH.format(d).replace(',', ''); };
const hojeBR = () => new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(new Date());
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function novo(){
  return {
    meta:{numero:`APR-PT-${new Date().getFullYear()}-0001`,rev:'00',codigo:'',status:'rascunho',liberadaEm:null,encerradaEm:null,eventos:[],exemplo:false},
    id:{empresa:'',cnpj:'',endEmpresa:END0(),cliRazao:'',cliCnpj:'',local:'',endLocal:END0(),os:'',servico:'',previsao:'',elaboracao:hojeBR()},
    ativ:{},outras:'',permNum:{},usarMatriz:true,modoEtapas:true,etapas:[],
    riscos:{},riscosExtra:[],impExtra:[],medidas:{},medidaOutra:'',epi:{},epc:{},epiOutro:'',epcOutro:'',
    equipe:[],
    emerg:{planos:[...PLANOS],tel:[{s:'',t:''},{s:'',t:''},{s:'',t:''},{s:'',t:''}],hospitais:[{nome:'',addr:END0(),tel:'',km:'',min:''}]},
    lib:{imped:{},req:{},gerais:{},ini:'',fim:'',motivo:'',elaborador:{nome:'',funcao:'',cpf:'',regTipo:'MTE',regNum:'',ass:null,em:null},liberador:{nome:'',funcao:'',cpf:'',ass:null,em:null}},
    suspensoes:[],
    enc:{chk:{},situacao:'concluido',obs:'',resp:{nome:'',funcao:'',cpf:'',ass:null,em:null}}
  };
}
/* Junta os dados gravados com os valores padrão (campos novos ganham padrão) */
function mesclar(base, extra){
  if(Array.isArray(base)) return Array.isArray(extra) ? extra : base;
  if(base && typeof base==='object'){ const o={...base}; if(extra && typeof extra==='object' && !Array.isArray(extra)) for(const k of Object.keys(extra)) o[k] = k in base ? mesclar(base[k], extra[k]) : extra[k]; return o; }
  return extra===undefined ? base : extra;
}
function normalizar(doc){
  const d0 = doc.dados || {};
  const s = mesclar(novo(), d0);
  /* Documentos anteriores à versão 3 continuam com a tabela de riscos antiga */
  if(!('modoEtapas' in d0)) s.modoEtapas = doc.status==='rascunho' && !Object.values(d0.riscos||{}).some(v=>v&&v.on) && !(d0.riscosExtra||[]).length;
  s.etapas.forEach(e=>{ e.ativ ??= ''; e.passo ??= ''; e.med ??= ''; e.riscos = Array.isArray(e.riscos) ? e.riscos : []; });
  syncEtapas(s);
  s.equipe.forEach(w=>{ w.trein ??= {}; w.cpf ??= ''; w.mat ??= ''; });
  s.emerg.hospitais.forEach(h=>{ h.addr = mesclar(END0(), h.addr||{}); });
  if(!s.emerg.hospitais.length) s.emerg.hospitais=[{nome:'',addr:END0(),tel:'',km:'',min:''}];
  s.meta = { ...s.meta, numero:doc.numero, status:doc.status, liberadaEm:doc.liberada_em, encerradaEm:doc.encerrada_em, suspensaPor:doc.suspensa_por, validadeIni:doc.validade_ini, validadeFim:doc.validade_fim,
             eventos:doc.eventos||[], verif:doc.codigo, cliente:doc.cliente_nome, clienteEnd:doc.cliente_endereco||{} };
  return s;
}
let state = null;   /* documento aberto */
const ED = { id:null, usuario:null, timer:null, salvando:false, pendente:false, onVoltar:null, auto:{} };
const podeU = acao => API.pode(ED.usuario, acao);
const somenteLeitura = () => !state || ['encerrada','cancelada'].includes(state.meta.status) || ED.usuario?.perfil==='consulta'
  || (state.meta.status==='rascunho' && !podeU('editar') && !podeU('liberar'));
const soLiberacao = () => state && state.meta.status==='rascunho' && !podeU('editar') && podeU('liberar');
/* Fases do rascunho: 1) APR sem pendências (abas 01 a 06) → 2) elaborador assina → 3) liberador confere, assina e libera */
const aprPend = () => pend().filter(p=>p.b && p.tab!=='lib');
const podeElab = () => !!state && state.meta.status==='rascunho' && podeU('editar') && !somenteLeitura();
const elabAberto = () => podeElab() && !aprPend().length;
const elabAssinou = () => !!state.lib.elaborador.ass;
const libAberta = () => !!state && state.meta.status==='rascunho' && podeU('liberar') && !somenteLeitura() && elabAssinou() && !aprPend().length;
const podeRetomar = () => podeU('liberar') || (ED.usuario?.perfil==='tecnico' && state.meta.suspensaPor===ED.usuario.id);
const NO_ARTIFACT = true;
const mapsDir = (o,d) => `https://www.google.com/maps/dir/?api=1${o?`&origin=${encodeURIComponent(o)}`:''}&destination=${encodeURIComponent(d)}&travelmode=driving`;
const mapsEmbed = (o,d) => o ? `https://maps.google.com/maps?saddr=${encodeURIComponent(o)}&daddr=${encodeURIComponent(d)}&output=embed` : `https://maps.google.com/maps?q=${encodeURIComponent(d)}&output=embed`;
let cur = 'ident';

function saveStatus(txt, err){ const el=$('savest'); if(el){ el.textContent=txt; el.classList.toggle('err',!!err); } }
function save(){
  if(!state || somenteLeitura()) return;
  syncEtapas();
  ED.pendente = true; saveStatus('Alterações não salvas');
  clearTimeout(ED.timer); ED.timer = setTimeout(salvarAgora, 1200);
}
async function salvarAgora(){
  clearTimeout(ED.timer);
  if(!ED.pendente || !state) return;
  if(ED.salvando){ ED.timer = setTimeout(salvarAgora, 600); return; }
  ED.salvando = true; ED.pendente = false; saveStatus('Salvando…');
  try {
    const { meta, ...dados } = state;
    dados.meta = { rev: meta.rev, codigo: meta.codigo };
    await API.call('salvar_documento', { p_id: ED.id, p_dados: dados });
    saveStatus('Salvo');
  } catch(e){
    ED.pendente = true; saveStatus('Erro ao salvar', true); API.toast(e.message, 'bad');
    ED.timer = setTimeout(salvarAgora, 5000);
  } finally { ED.salvando = false; }
}
window.addEventListener('beforeunload', e=>{ if(ED.pendente){ salvarAgora(); e.preventDefault(); e.returnValue=''; } });
function get(p){ return p.split('.').reduce((o,k)=>o==null?undefined:o[k], state); }
function set(p,v){ const ks=p.split('.'); let o=state; for(let i=0;i<ks.length-1;i++){ if(o[ks[i]]==null) o[ks[i]]={}; o=o[ks[i]]; } o[ks[ks.length-1]]=v;
  if(alteraAPR(p)) invalidarAssElab(); else if(alteraConf(p)) invalidarAssLib(); save(); }
/* Caminhos que fazem parte da APR (abas 01 a 06) ou dos dados do elaborador.
   As assinaturas dos executantes são colhidas na liberação e não contam como alteração da APR. */
const alteraAPR = p => (!/^(lib|enc)\./.test(p) && !/^equipe\.\d+\.(ass|em)$/.test(p)) || (/^lib\.elaborador\./.test(p) && !/\.(ass|em)$/.test(p));
/* Caminhos da liberação que, alterados depois da assinatura do liberador, exigem que ele assine de novo */
const alteraConf = p => /^lib\.(imped|req|gerais)\./.test(p) || /^lib\.liberador\.(nome|funcao|cpf)$/.test(p) || /^equipe\.\d+\.ass$/.test(p);
/* Apaga as confirmações da liberação e as assinaturas dos executantes e do liberador */
function limparLiberacao(){
  const L=state.lib; L.imped={}; L.req={}; L.gerais={}; L.liberador.ass=null; L.liberador.em=null;
  state.equipe.forEach(w=>{ w.ass=null; w.em=null; });
}
function invalidarAssElab(){
  if(!state || state.meta.status!=='rascunho' || !state.lib.elaborador.ass) return;
  state.lib.elaborador.ass=null; state.lib.elaborador.em=null; limparLiberacao();
  API.toast('A APR foi alterada depois da assinatura do elaborador. Todas as assinaturas (elaborador, executantes e liberador) e as conferências da liberação foram apagadas: confira e assine de novo.','bad');
}
function invalidarAssLib(){
  if(!state || state.meta.status!=='rascunho' || !state.lib.liberador.ass) return;
  state.lib.liberador.ass=null; state.lib.liberador.em=null;
  API.toast('A liberação foi alterada depois da assinatura do liberador. A assinatura dele foi removida: assine de novo, por último.','bad');
}
const fid = k => 'f_'+k.replace(/\./g,'_');
const evento = txt => state.meta.eventos.push({em:new Date().toISOString(),txt});

/* ---------- Regras ---------- */
function nivel(p,s){ if(!p||!s) return null; const n=p*s; const c=n<=3?'baixo':n<=6?'moderado':n<=9?'alto':'critico'; return {n,c,label:{baixo:'Baixo',moderado:'Moderado',alto:'Alto',critico:'Crítico'}[c]}; }
const ativOn = () => ATIV.filter(a=>state.ativ[a.id]);
/* Requisitos que não repetem a pergunta da condição impeditiva (a chave mantém o índice original) */
const reqDe = a => a.req.map((t,i)=>({i,t})).filter(x=>!(a.reqDup||[]).includes(x.i));
function requisitos(){ const r=[]; ativOn().forEach(a=>reqDe(a).forEach(x=>r.push({key:`${a.id}_${x.i}`,txt:x.t,a}))); return r; }
const impPorRisco = a => (a.rk||[]).filter(x=>state.riscos[x]?.on).map(x=>RISCOS.find(y=>y[0]===x)[1]);
const impAplica = a => !!state.ativ[a.id] || impPorRisco(a).length>0;
function impedimentos(){
  const L=[];
  ATIV.filter(a=>a.tipo!=='controle' && impAplica(a)).forEach(a=>L.push({key:a.id,titulo:`Nº ${a.n} – ${a.cond}`,perg:a.perg,orient:a.orient,seNao:a.seNao,a}));
  IMP_GERAIS.forEach(([k,pg,ori,sn])=>L.push({key:k,titulo:'',perg:pg,orient:ori,seNao:sn}));
  state.impExtra.forEach((x,i)=>{ if(tx(x.txt)) L.push({key:'ix_'+i,titulo:'',perg:tx(x.txt),orient:'',seNao:'A atividade não pode ser iniciada ou deve ser suspensa.'}); });
  return L;
}
function treinReq(){ return [...new Set(ativOn().map(a=>a.trein).filter(Boolean))]; }
const riscosOn = () => RISCOS.filter(r=>state.riscos[r[0]]?.on);
const MAX_ETAPAS = 15;
const nomeRisco = r => r.id==='outro' ? (tx(r.nome)||'Outro risco') : (RISCOS.find(x=>x[0]===r.id)||[,''])[1];
/* No modo etapas, a lista de riscos potenciais é montada a partir das etapas, com o maior nível de cada risco.
   Assim as sugestões de medidas, as condições impeditivas e a verificação do servidor continuam valendo. */
function syncEtapas(s=state){
  if(!s || !s.modoEtapas) return;
  const rk={}, ex=[];
  s.etapas.forEach(e=>e.riscos.forEach(r=>{
    if(r.id==='outro'){ ex.push({nome:tx(r.nome),p:r.p||null,s:r.s||null,medida:tx(e.med).split('\n').map(tx).filter(Boolean).join('; ')}); return; }
    const o=rk[r.id], n=(r.p||0)*(r.s||0);
    if(!o) rk[r.id]={on:true,p:r.p||null,s:r.s||null};
    else if(n>(o.p||0)*(o.s||0)){ o.p=r.p; o.s=r.s; }
  }));
  s.riscos=rk; s.riscosExtra=ex; s.usarMatriz=true;
}
/* Resumo dos riscos das etapas: maior nível e em quais etapas aparece */
function resumoRiscos(){
  const m=new Map();
  state.etapas.forEach((e,i)=>e.riscos.forEach(r=>{ const nm=nomeRisco(r), nv=nivel(r.p,r.s), k=r.id==='outro'?'o:'+nm.toLowerCase():r.id;
    const o=m.get(k)||{nome:nm,nv:null,et:[]}; if(nv&&(!o.nv||nv.n>o.nv.n)) o.nv=nv; if(!o.et.includes(i+1)) o.et.push(i+1); m.set(k,o); }));
  return [...m.values()].sort((a,b)=>(b.nv?.n||0)-(a.nv?.n||0));
}
function sugMedidas(e){
  const t=tx(e.med).toLowerCase();
  return [...new Set(e.riscos.flatMap(r=>(SUG[r.id]?.m)||[]))].map(id=>(MEDIDAS.find(x=>x[0]===id)||[,''])[1]).filter(n=>n&&!t.includes(n.toLowerCase()));
}
function sugeridos(){
  const m=new Set(),e=new Set(),c=new Set();
  riscosOn().forEach(r=>{ const g=SUG[r[0]]||{}; (g.m||[]).forEach(x=>m.add(x)); (g.e||[]).forEach(x=>e.add(x)); (g.c||[]).forEach(x=>c.add(x)); });
  return {m,e,c};
}
/* Origem da rota até os hospitais: endereço da atividade; se estiver em branco, o da empresa */
const endOk = a => !!(a && tx(a.log) && tx(a.cidade));
function origemRota(s=state){ return endOk(s.id.endLocal) ? fmtEnd(s.id.endLocal,false) : endOk(s.id.endEmpresa) ? fmtEnd(s.id.endEmpresa,false) : ''; }
const origemTipo = (s=state) => endOk(s.id.endLocal) ? 'local' : endOk(s.id.endEmpresa) ? 'empresa' : '';
function statusVis(){ const s=state.meta.status, f=state.meta.validadeFim||state.lib.fim; if(s==='cancelada') return s; if(s==='liberada' && f && new Date()>new Date(f)) return 'vencida'; return s; }

function pend(){
  const P=[], add=(tab,msg,b=true,q='')=>P.push({tab,msg,b,q}), s=state, L=s.lib;
  /* 01 Identificação */
  if(!s.id.servico.trim()) add('ident','Descreva o serviço a ser executado',true,'i1');
  if(s.id.elaboracao && s.id.elaboracao > hojeBR()) add('ident','A data de elaboração da APR não pode ser no futuro',true,'i1');
  if(!s.id.empresa.trim()) add('ident','Informe a razão social da empresa executante',true,'i3');
  if(!s.id.cnpj.trim()) add('ident','Informe o CNPJ da empresa executante',true,'i3');
  else if(!cnpjOk(s.id.cnpj)) add('ident','CNPJ da empresa executante inválido',true,'i3');
  if(tx(s.id.cliCnpj) && !cnpjOk(s.id.cliCnpj)) add('ident','Dados da atividade: CNPJ inválido',true,'i4');
  if(tx(s.id.cliRazao) && !tx(s.id.cliCnpj)) add('ident','Dados da atividade: informe o CNPJ do cliente',false,'i4');
  if(!origemRota()) add('ident','Informe o endereço do local do serviço ou da empresa (origem da rota até o hospital)',false,'i4');
  /* 02 Riscos */
  const rk = riscosOn();
  if(s.modoEtapas){
    if(!s.etapas.length) add('riscos','Inclua ao menos uma etapa na descrição das atividades',true,'r1');
    s.etapas.forEach((e,i)=>{ const E=`Etapa ${i+1}`;
      if(!tx(e.ativ)) add('riscos',`${E}: informe a atividade`,true,'r1');
      if(!tx(e.passo)) add('riscos',`${E}: descreva o passo a passo`,true,'r1');
      if(!e.riscos.length) add('riscos',`${E}: inclua ao menos um risco`,true,'r1');
      e.riscos.forEach((r,j)=>{ const nm=nomeRisco(r), nv=nivel(r.p,r.s);
        if(r.id==='outro'&&!tx(r.nome)) add('riscos',`${E}: descreva o risco ${j+1}`,true,'r1');
        if(!nv) add('riscos',`${E}: avalie probabilidade e severidade – ${nm}`,true,'r1');
        else if(nv.c==='critico') add('riscos',`${E}: risco crítico (${nv.n}) – ${nm}. Reforce as medidas e reavalie`,true,'r1');
        else if(nv.c==='alto') add('riscos',`${E}: risco alto (${nv.n}) – ${nm}`,false,'r1'); });
      if(!tx(e.med)) add('riscos',`${E}: informe as medidas preventivas`,true,'r1'); });
  } else {
    if(!rk.length && !s.riscosExtra.length) add('riscos','Selecione ao menos um risco');
    s.riscosExtra.forEach((x,i)=>{ const nm=x.nome.trim()||`Outro risco ${i+1}`, nv=nivel(x.p,x.s);
      if(!x.nome.trim()) add('riscos',`Outro risco ${i+1}: descreva o risco`);
      if(s.usarMatriz){ if(!nv) add('riscos',`Avalie probabilidade e severidade: ${nm}`);
        else if(nv.c==='critico') add('riscos',`Risco crítico (${nv.n}): ${nm}. Reforce as medidas e reavalie`); }
      if(!(x.medida||'').trim()) add('riscos',`Sem medida de controle: ${nm}`); });
    if(s.usarMatriz) rk.forEach(r=>{ const v=s.riscos[r[0]], nv=nivel(v.p,v.s);
      if(!nv) add('riscos',`Avalie probabilidade e severidade: ${r[1]}`);
      else if(nv.c==='critico') add('riscos',`Risco crítico (${nv.n}): ${r[1]}. Reforce as medidas e reavalie`); });
  }
  /* 03 Atividades críticas */
  ativOn().filter(a=>a.tipo==='permissao').forEach(a=>{ if(!(s.permNum[a.id]||'').trim()) add('ativ',`Atividade ${a.n}: informe o nº da ${a.doc}`,true,'a1'); });
  if(s.ativ.a10 && (s.ativ.a01||s.ativ.a04||s.ativ.a05||s.ativ.a06)) add('ativ','Intempéries junto com altura, eletricidade ou içamento: interromper se houver chuva, vento ou raios',false,'a1');
  /* 04 Medidas e EPI: se os riscos sugerem itens, ao menos um item da lista deve ser marcado */
  const sg = sugeridos();
  [['m','medidas',MEDIDAS,'Marque ao menos uma medida de segurança','m2'],['e','epi',EPI,'Marque ao menos um EPI','m3'],['c','epc',EPC,'Marque ao menos um EPC ou ferramenta','m4']].forEach(([k,base,list,msg,q])=>{
    if(sg[k].size && !list.some(([id])=>s[base][id])) add('medidas',msg,true,q); });
  /* 05 Equipe */
  const tr = treinReq();
  if(!s.equipe.length) add('equipe','Inclua os trabalhadores executantes');
  s.equipe.forEach((w,i)=>{ const nm=w.nome.trim()||`Trabalhador ${i+1}`;
    if(!(w.cpf||'').trim()) add('equipe',`${nm}: informe o CPF`);
    else if(!cpfOk(w.cpf)) add('equipe',`${nm}: CPF inválido`);
    if(!w.nome.trim()) add('equipe',`Trabalhador ${i+1}: informe o nome`);
    if(!tx(w.funcao)) add('equipe',`${nm}: informe a função`);
    tr.forEach(t=>{ if(!w.trein?.[t]) add('equipe',`${nm}: sem treinamento ${TREIN[t]} válido`); });
    if(!w.aso) add('equipe',`${nm}: ASO apto não confirmado`); });
  /* 06 Emergência */
  if(!s.emerg.tel.some(t=>t.t.trim())) add('emerg','Informe ao menos um telefone de emergência do local',true,'g2');
  if(!s.emerg.hospitais.some(h=>tx(h.nome)&&tx(h.addr.log)&&tx(h.addr.cidade))) add('emerg','Informe ao menos um hospital de referência com endereço (logradouro e cidade)',true,'h0');
  s.emerg.hospitais.forEach((h,i)=>{ if(h.nome.trim()&&!h.tel.trim()) add('emerg',`${h.nome}: informe o telefone do hospital`,false,'h'+i); });
  /* 07 Liberação */
  if(!tx(L.elaborador.nome)) add('lib','Elaborador da APR: informe o nome',true,'l1');
  if(!tx(L.elaborador.regNum)) add('lib',`Elaborador da APR: informe o registro ${L.elaborador.regTipo}`,true,'l1');
  if(tx(L.elaborador.cpf) && !cpfOk(L.elaborador.cpf)) add('lib','Elaborador da APR: CPF inválido',true,'l1');
  if(!L.elaborador.ass) add('lib','Elaborador da APR: falta assinatura',true,'l1');
  impedimentos().forEach(c=>{ const v=L.imped?.[c.key];
    if(v==='presente') add('lib',`Resposta "Não": ${c.perg} A atividade não pode ser liberada`,true,'l2');
    else if(v!=='ausente') add('lib',`Responda a verificação: ${c.perg}`,true,'l2'); });
  requisitos().forEach(r=>{ if(!L.req[r.key]) add('lib',`Requisito: ${r.txt}`,true,'l3'); });
  GERAIS.forEach(g=>{ if(!L.gerais[g[0]]) add('lib',`Conferência no local: ${g[1]}`,true,'l3'); });
  s.equipe.forEach((w,i)=>{ if(!w.ass) add('lib',`${tx(w.nome)||`Executante ${i+1}`}: falta assinatura de ciência`,true,'l4'); });
  if(!tx(L.liberador.nome)) add('lib','Liberador da PT: informe o nome',true,'l6');
  if(!tx(L.liberador.cpf)) add('lib','Liberador da PT: informe o CPF',true,'l6');
  else if(!cpfOk(L.liberador.cpf)) add('lib','Liberador da PT: CPF inválido',true,'l6');
  if(!L.liberador.ass) add('lib','Liberador da PT: falta assinatura (assina por último)',true,'l6');
  if(tx(L.elaborador.nome) && tx(L.elaborador.nome).toLowerCase()===tx(L.liberador.nome).toLowerCase()) add('lib','Elaborador e liberador são a mesma pessoa',false,'l6');
  return P;
}
/* Pendências do encerramento (aba 08) */
function pendEnc(){
  const P=[], add=(msg,q)=>P.push({tab:'enc',msg,b:true,q}), E=state.enc;
  ENC.forEach(x=>{ if(!E.chk[x[0]]) add(`Conferência final: ${x[1]}`,'e1'); });
  if(E.situacao==='nao' && !tx(E.obs)) add('Informe nas observações o motivo de o serviço não ter sido concluído','e2');
  if(!tx(E.resp.nome)) add('Responsável pelo encerramento: informe o nome','e3');
  if(!cpfOk(E.resp.cpf)) add('Responsável pelo encerramento: informe um CPF válido','e3');
  if(!E.resp.ass) add('Responsável pelo encerramento: falta assinatura','e3');
  return P;
}
/* Quadro numerado com sinal de completo/pendência */
function qStatus(q){ const P=[...(ED.P||[]),...(ED.PE||[])].filter(p=>p.q===q), b=P.filter(p=>p.b).length, w=P.length-b;
  return `<span data-qs="${q}" class="qs ${b?'pd':w?'wa':'ok'}">${b?`${b} pendência${b>1?'s':''}`:w?`${w} alerta${w>1?'s':''}`:'✓ Completo'}</span>`; }
function quadro(n,titulo,q,corpo,o={}){
  return `<section class="box qd"${o.id?` id="${o.id}"`:''}><div class="qh">${n?`<span class="qn">${n}</span>`:''}<h2 class="qt">${titulo}</h2>${o.acoes||''}${q?qStatus(q):''}</div>${corpo}</section>`; }

/* ---------- Helpers de formulário ---------- */
function inp(k,label,o={}){
  const v=get(k)??'', req=o.req?' <b class="rq">*</b>':'';
  const ctl = o.area
    ? `<textarea id="${fid(k)}" data-k="${k}" rows="${o.rows||3}" placeholder="${esc(o.ph||'')}">${esc(v)}</textarea>`
    : `<input id="${fid(k)}" type="${o.type||'text'}" data-k="${k}" ${o.map?'data-map':''} ${o.mask?`data-mask="${o.mask}" maxlength="${MASK[o.mask].len}" autocomplete="off"`:''} ${o.mask&&v&&!MASK[o.mask].ok(v)?'class="invalid"':''} value="${esc(v)}" placeholder="${esc(o.ph||'')}" ${o.inputmode?`inputmode="${o.inputmode}"`:''}>`;
  const err = o.mask ? `<em class="err" ${v&&String(v).length>=MASK[o.mask].len&&!MASK[o.mask].ok(v)?'':'hidden'}>${MASK[o.mask].msg}. Confira os números.</em>` : '';
  return `<label class="fld ${o.cls||''}"><span>${label}${req}</span>${ctl}${err}</label>`;
}
function chk(k,label,o={}){ return `<label class="ck ${o.cls||''}"><input type="checkbox" id="${fid(k)}" data-k="${k}" ${get(k)?'checked':''}><span>${label}${o.tag?`<span class="tag">${o.tag}</span>`:''}</span></label>`; }
function sigBlock(k,label){
  const v=get(k), em=get(k.replace(/\.ass$/,'.em'));
  return `<div class="fld"><span>${label}</span><div class="sig">${v?`<img src="${v}" data-sig="${v}" alt="Assinatura"><span class="when">${fmtDH(em)}</span><button type="button" class="btn ghost" data-act="sign" data-k="${k}" data-label="${esc(label)}">Refazer</button>`:`<button type="button" class="btn" data-act="sign" data-k="${k}" data-label="${esc(label)}">✍ Assinar</button>`}</div></div>`;
}

const cepSt = {};
function endBlock(base,title,o={}){
  const copiar = o.copiar ? `<button type="button" class="btn ghost btn-sm" data-act="copiarEnd" data-base="${base}">Copiar endereço do cadastro</button>` : '';
  return `<div class="addr"><div class="addr-h" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="flex:1">${title}${o.req?' <b class="rq">*</b>':''}</span>${copiar}</div><div class="ag2">
    ${inp(base+'.cep','CEP',{mask:'cep',inputmode:'numeric',ph:'00000-000',cls:'a-cep'})}
    <div class="cepst a-st" data-st="${base}">${esc(cepSt[base]||'Digite o CEP para preencher o endereço, ou preencha à mão.')}</div>
    ${inp(base+'.log','Logradouro',{cls:'a-log',map:1})}
    ${inp(base+'.num','Número',{cls:'a-num',map:1})}
    ${inp(base+'.comp','Complemento',{cls:'a-comp'})}
    ${inp(base+'.bairro','Bairro',{cls:'a-bai',map:1})}
    ${inp(base+'.cidade','Cidade',{cls:'a-cid',map:1})}
    ${inp(base+'.uf','UF',{cls:'a-uf',map:1})}
  </div></div>`;
}
function setSt(base,txt){ cepSt[base]=txt; document.querySelectorAll(`[data-st="${base}"]`).forEach(e=>e.textContent=txt); }
async function buscarCep(base,cep){
  setSt(base,'Buscando CEP…');
  let d=null;
  try{ const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`); if(r.ok){ const j=await r.json(); d = j.erro ? false : {log:j.logradouro,bairro:j.bairro,cidade:j.localidade,uf:j.uf}; } }catch(e){}
  if(d==null){ try{ const r=await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`); if(r.ok){ const j=await r.json(); d={log:j.street,bairro:j.neighborhood,cidade:j.city,uf:j.state}; } else if(r.status===404) d=false; }catch(e){} }
  const a=get(base); if(!a || String(a.cep).replace(/\D/g,'')!==cep) return;
  if(d){ a.log=d.log||a.log; a.bairro=d.bairro||a.bairro; a.cidade=d.cidade||a.cidade; a.uf=d.uf||a.uf; save();
    cepSt[base] = d.log ? 'Endereço encontrado. Informe o número.' : 'CEP geral da cidade. Complete logradouro e bairro.';
    renderTab(); const f=document.getElementById(fid(base+(d.log?'.num':'.log'))); f&&f.focus(); }
  else if(d===false) setSt(base,'CEP não encontrado. Preencha o endereço manualmente.');
  else setSt(base,'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.');
}

/* ---------- Abas ---------- */
const T = {};
T.ident = () =>
  quadro(1,'Identificação','i1',`<p class="hint">A APR pode ser elaborada dias antes. A data e o horário reais da execução são os da liberação da PT, no dia do trabalho.</p>
    <div class="form-grid">
      ${inp('id.servico','Serviço a ser executado',{req:1,area:1,rows:3,cls:'c12'})}
      ${inp('id.elaboracao','Elaboração da APR',{type:'date',cls:'c4'})}
      ${inp('id.previsao','Previsão de execução',{type:'date',cls:'c4'})}
      ${inp('id.os','Ordem de serviço',{cls:'c4'})}
    </div>`)
 +quadro(2,'Documento','i2',`<div class="form-grid">
      <div class="fld c4"><span>Número</span><div style="font:500 16px/1.4 var(--f-mono);padding:8px 0">${esc(state.meta.numero)}</div></div>
      ${inp('meta.codigo','Código do formulário',{cls:'c4',ph:'Ex.: código interno do cliente'})}
      ${inp('meta.rev','Revisão',{cls:'c4'})}
    </div><p class="hint" style="margin:10px 0 0">O número é gerado pelo sistema, em sequência por empresa e ano.</p>`)
 +quadro(3,'Empresa executante','i3',`<div class="form-grid">
      ${inp('id.empresa','Razão social',{req:1,cls:'c8'})}
      ${inp('id.cnpj','CNPJ',{req:1,cls:'c4',mask:'cnpj',ph:'00.000.000/0000-00'})}
    </div><div style="margin-top:12px">${endBlock('id.endEmpresa','Endereço da empresa',{copiar:1})}</div>`)
 +quadro(4,'Dados da atividade','i4',`<p class="hint">Cliente e local onde a atividade será executada. Campos opcionais: o que ficar em branco não aparece no documento.</p>
    <div class="form-grid">
      ${inp('id.cliRazao','Razão social do cliente',{cls:'c8'})}
      ${inp('id.cliCnpj','CNPJ do cliente',{cls:'c4',mask:'cnpj',ph:'00.000.000/0000-00'})}
      ${inp('id.local','Local do serviço',{cls:'c12',ph:'Ex.: Galpão B, sala de máquinas, telhado do bloco 2'})}
    </div><div style="margin-top:12px">${endBlock('id.endLocal','Endereço do local do serviço')}</div>
    <p class="hint" style="margin:10px 0 0">A rota até os hospitais parte deste endereço. Se ficar em branco, usa o endereço da empresa.</p>`);

/* Riscos das etapas que sugerem cada atividade crítica */
function riscosSugerem(a){
  const ids=new Set([...(a.riscos||[]),...(a.rk||[])]), out=[];
  state.etapas.forEach((e,i)=>e.riscos.forEach(r=>{ if(ids.has(r.id)) out.push(`${nomeRisco(r)} (etapa ${i+1})`); }));
  return [...new Set(out)];
}
function cartaoRegra(a){
  return `<div class="cond ${a.tipo}"><div class="hd"><span class="kind ${a.tipo}">${TIPO[a.tipo]}</span></div>
    <p>${a.regra}</p>
    ${a.tipo==='permissao'?inp(`permNum.${a.id}`,`Nº da ${a.doc}`,{req:1}):''}
    ${a.trein?`<p><b>Treinamento exigido:</b> ${TREIN[a.trein]} para todos os executantes.</p>`:''}
    ${reqDe(a).length?`<p style="margin:6px 0 2px"><b>Requisitos conferidos na liberação:</b></p><ul>${reqDe(a).map(x=>`<li>${x.t}</li>`).join('')}</ul>`:''}</div>`;
}
function cartaoImp(a,aviso){
  return `<div class="imp"><div class="hd"><span>Condição impeditiva · verificada na liberação</span></div>
    ${aviso?`<p class="ap">${aviso}</p>`:''}<p class="q">${a.perg}</p><p>${a.orient}</p><p><b>Se “Não”:</b> ${a.seNao}</p></div>`;
}
T.ativ = () =>
  quadro(1,'Atividades críticas e condições especiais','a1',`<p class="hint">Toque nas atividades presentes no serviço. As destacadas foram sugeridas pelos riscos das etapas; confirme marcando ou deixe desmarcada se não se aplicar.</p>
    <div class="arows">${ATIV.map(a=>{ const on=!!state.ativ[a.id], pr=impPorRisco(a), sg=on?[]:riscosSugerem(a);
      const dir = on ? cartaoRegra(a)+(a.tipo!=='controle'?cartaoImp(a,''):'')
        : (sg.length?`<p class="sugr">Sugerida pelos riscos: ${esc(sg.join('; '))}</p>`:'')
          +(a.tipo!=='controle'&&pr.length?cartaoImp(a,`Aplicável pelo risco marcado: <b>${esc(pr.join('; '))}</b>`):'');
      return `<div class="arow"><button type="button" class="tile ${!on&&sg.length?'sug':''}" data-act="ativ" data-id="${a.id}" aria-pressed="${on}"><span class="no">${a.n}</span>${svg(a.icon)}<span class="nm">${a.nome}</span></button>
        <div class="adir">${dir||'<span class="off">Não marcada</span>'}</div></div>`; }).join('')}</div>`)
 +quadro(2,'Condições impeditivas adicionais','',`<p class="hint">Perguntas extras para este serviço, verificadas na liberação. Escreva de forma que “Sim” libere o trabalho.</p>
    <div class="stack">${state.impExtra.map((x,i)=>`<div class="imp">${inp(`impExtra.${i}.txt`,`Condição adicional ${i+1}`,{area:1,rows:2,ph:'Ex.: A área está isolada e sem circulação de pessoas?'})}<div><button class="btn ghost" data-act="rmImp" data-i="${i}">Remover</button></div></div>`).join('')}
    <button class="addcard" style="min-height:64px" data-act="addImp">+ Incluir condição impeditiva</button></div>`)
 +quadro(3,'Outras situações','',inp('outras','Outras situações',{area:1,rows:2,ph:'Descreva outras condições especiais do serviço'}));

const optPS = (lbl,v)=>`<option value="">${lbl}</option>`+[1,2,3,4].map(i=>`<option value="${i}" ${v==i?'selected':''}>${lbl[0]} ${i} – ${(lbl[0]==='P'?P_LBL:S_LBL)[i]}</option>`).join('');
/* Nas etapas o cabeçalho da coluna já diz P ou S: a opção mostra só o número e o nome */
const optEt = (k,v)=>`<option value="">Escolha</option>`+[1,2,3,4].map(i=>`<option value="${i}" ${v==i?'selected':''}>${i} – ${(k==='P'?P_LBL:S_LBL)[i]}</option>`).join('');
function matrizHTML(cells){
  let mx='';
  for(let s=4;s>=1;s--){ mx += `<div class="ax">${s}</div>`;
    for(let p=1;p<=4;p++){ const nv=nivel(p,s), list=cells[`${p}${s}`]||[];
      mx += `<div class="c lv-${nv.c}" title="${esc(list.join('\n')||nv.label)}">${nv.n}${list.length?`<span class="q">${list.length}</span>`:''}</div>`; } }
  mx += `<div></div>`+[1,2,3,4].map(p=>`<div class="ax">${p}</div>`).join('');
  return `<div class="mx" style="margin-top:10px">${mx}</div>
    <div style="display:flex;justify-content:space-between;font:600 12px/1 var(--f-display);color:var(--muted);margin-top:6px;padding-left:32px"><span>← Probabilidade (P) →</span><span>linhas: Severidade (S)</span></div>
    <div class="legend"><span class="lv lv-baixo">Baixo 1–3</span><span class="lv lv-moderado">Moderado 4–6</span><span class="lv lv-alto">Alto 8–9</span><span class="lv lv-critico">Crítico 12–16</span></div>
    <div class="cols" style="grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">
      <div class="scale">${[1,2,3,4].map(i=>`<b>P${i}</b><span>${P_LBL[i]}</span>`).join('')}</div>
      <div class="scale">${[1,2,3,4].map(i=>`<b>S${i}</b><span>${S_LBL[i]}</span>`).join('')}</div>
    </div>`;
}

/* Descrição das atividades por etapa (documentos a partir da versão 3) */
const ICL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
/* Botões 1 a 4 de probabilidade (P) ou severidade (S) */
function botoesPS(k,path,v){
  const L=k==='P'?P_LBL:S_LBL, nome=k==='P'?'Probabilidade (P)':'Severidade (S)';
  return `<div class="ps"><span class="psl">${nome}</span><div class="psg" role="radiogroup" aria-label="${nome}">${[1,2,3,4].map(i=>`<button type="button" data-act="ps" data-k="${path}" data-v="${i}" aria-pressed="${v==i}" aria-label="${k}${i} – ${L[i]}">${i}</button>`).join('')}</div><span class="psn ${v?'':'v'}">${v?L[v]:'Escolha de 1 a 4'}</span></div>`;
}
function celulasMatriz(){ const cells={}; state.etapas.forEach((e,i)=>e.riscos.forEach(r=>{ if(r.p&&r.s){ const k=`${r.p}${r.s}`; (cells[k]=cells[k]||[]).push(`${nomeRisco(r)} (etapa ${i+1})`); } })); return cells; }

/* Descrição das atividades por etapa */
function riscosEtapas(){
  const E = state.etapas, resumo = resumoRiscos();
  const addSel = (e,i) => { const usados=new Set(e.riscos.map(r=>r.id)), livres=RISCOS.filter(r=>!usados.has(r[0]));
    return `<select id="addRk_${i}" aria-label="Risco para incluir na etapa ${i+1}"><option value="">Escolha um risco da lista…</option>
      <optgroup label="Riscos potenciais">${livres.map(r=>`<option value="${r[0]}">${esc(r[1])}</option>`).join('')}</optgroup>
      <optgroup label="Não está na lista"><option value="outro">Outro risco (descrever)</option></optgroup></select>`; };
  const legenda = `<div class="rleg"><span><b>P</b> ${[1,2,3,4].map(i=>`${i} ${P_LBL[i]}`).join(' · ')}</span><span><b>S</b> ${[1,2,3,4].map(i=>`${i} ${S_LBL[i]}`).join(' · ')}</span>
    <span class="lv lv-baixo">Baixo 1–3</span><span class="lv lv-moderado">Moderado 4–6</span><span class="lv lv-alto">Alto 8–9</span><span class="lv lv-critico">Crítico 12–16</span>
    <button type="button" class="btn btn-sm" data-act="matriz">▦ Ver matriz de risco</button></div>`;
  return quadro(1,'Descrição das atividades','r1',`<p class="hint">Divida o serviço em etapas. Em cada etapa, informe os riscos, avalie a probabilidade (P) e a severidade (S) considerando as medidas que serão adotadas, e descreva as medidas preventivas.</p>
    ${legenda}
    ${E.map((e,i)=>{ const sg=sugMedidas(e); return `<div class="etapa">
      <div class="et-hd"><span class="et-n">${i+1}</span><b>Etapa ${i+1}</b><span class="et-t">${esc(tx(e.ativ))}</span>
        <button type="button" class="btn ghost btn-sm" data-act="upEtapa" data-i="${i}" ${i?'':'disabled'} aria-label="Subir a etapa ${i+1}">↑</button>
        <button type="button" class="ibtn" data-act="rmEtapa" data-i="${i}" title="Remover etapa" aria-label="Remover a etapa ${i+1}">${ICL}</button></div>
      <div class="et-bd">
        ${inp(`etapas.${i}.ativ`,'Atividade',{req:1,ph:'Ex.: Deslocamento até a empresa'})}
        ${inp(`etapas.${i}.passo`,'Passo a passo',{req:1,area:1,rows:2,ph:'Como a etapa será executada'})}
        <div class="fld"><span>Riscos e avaliação <b class="rq">*</b></span></div>
        ${e.riscos.length?`<div class="et-rs"><div class="et-rh"><span>Risco</span><span>Probabilidade (P)</span><span>Severidade (S)</span><span>Nível</span><span></span></div>
          ${e.riscos.map((r,j)=>{ const nv=nivel(r.p,r.s), imA=r.id!=='outro'&&ATIV.find(a=>(a.rk||[]).includes(r.id)), base=`etapas.${i}.riscos.${j}`;
            const lix=`<button type="button" class="ibtn" data-act="rmRiscoEt" data-i="${i}" data-j="${j}" title="Remover risco" aria-label="Remover ${esc(nomeRisco(r))}">${ICL}</button>`;
            return `<div class="et-r">
            <div class="et-rn"><div>${r.id==='outro'?`<b>Outro risco</b>${inp(base+'.nome','Outro risco',{ph:'Descreva o risco'})}`:`<b>${esc(nomeRisco(r))}</b>`}${imA?`<small class="et-imp">Ativa a condição impeditiva Nº ${imA.n} – ${esc(imA.cond)}</small>`:''}</div><span class="et-xm">${lix}</span></div>
            ${botoesPS('P',base+'.p',r.p)}${botoesPS('S',base+'.s',r.s)}
            <div class="nvb ${nv?'lv-'+nv.c:'nv0'}"><big>${nv?nv.n:'—'}</big>${nv?nv.label.toUpperCase():'AVALIAR'}</div>
            <span class="et-xd">${lix}</span></div>`; }).join('')}</div>`
          :'<div class="empty" style="padding:10px">Nenhum risco nesta etapa.</div>'}
        <div class="et-add">${addSel(e,i)}<button type="button" class="btn pri" data-act="addRiscoEt" data-i="${i}">+ Adicionar risco</button></div>
        ${inp(`etapas.${i}.med`,'Medidas preventivas',{req:1,area:1,rows:3,ph:'Uma medida por linha'})}
        ${sg.length?`<div class="et-sug"><span>Sugestões:</span>${sg.map(m=>`<button type="button" data-act="sugMed" data-i="${i}" data-m="${esc(m)}">+ ${esc(m)}</button>`).join('')}</div>`:''}
      </div></div>`; }).join('')}
    ${E.length<MAX_ETAPAS?`<button type="button" class="btn pri" data-act="addEtapa">+ Adicionar etapa</button>`:`<p class="hint" style="margin:0">Limite de ${MAX_ETAPAS} etapas por documento.</p>`}`)
  + quadro(2,'Riscos potenciais (resumo)','',`<p class="hint">Montado a partir das etapas, com o maior nível de cada risco.</p>
      ${resumo.length?`<div class="et-res">${resumo.map(r=>`<div><span class="lv ${r.nv?'lv-'+r.nv.c:''}">${r.nv?`${r.nv.label} · ${r.nv.n}`:'—'}</span><span>${esc(r.nome)}</span><small>Etapa${r.et.length>1?'s':''} ${r.et.join(', ')}</small></div>`).join('')}</div>`:'<div class="empty">Os riscos aparecem aqui conforme você inclui nas etapas.</div>'}`);
}

T.riscos = () => {
  if(state.modoEtapas) return riscosEtapas();
  const sugA = new Set(ativOn().flatMap(a=>a.riscos));
  const cells = {}; [...riscosOn().map(r=>({...state.riscos[r[0]],nome:r[1]})),...state.riscosExtra.map(x=>({...x,nome:x.nome||'Outro risco'}))].forEach(v=>{ if(v.p&&v.s){ const k=`${v.p}${v.s}`; (cells[k]=cells[k]||[]).push(v.nome); } });
  const opt = (lbl,v)=>`<option value="">${lbl}</option>`+[1,2,3,4].map(i=>`<option value="${i}" ${v==i?'selected':''}>${lbl[0]} ${i} – ${(lbl[0]==='P'?P_LBL:S_LBL)[i]}</option>`).join('');
  let mx = '';
  for(let s=4;s>=1;s--){
    mx += `<div class="ax">${s}</div>`;
    for(let p=1;p<=4;p++){ const nv=nivel(p,s), list=cells[`${p}${s}`]||[];
      mx += `<div class="c lv-${nv.c}" title="${esc(list.join('\n')||nv.label)}">${nv.n}${list.length?`<span class="q">${list.length}</span>`:''}</div>`; }
  }
  mx += `<div></div>`+[1,2,3,4].map(p=>`<div class="ax">${p}</div>`).join('');
  return `
<div class="cols w2">
  <section class="box"><h2>Riscos potenciais</h2><p class="hint">Marque os riscos do serviço. Os destacados foram sugeridos pelas atividades críticas.${state.usarMatriz?' Para cada risco, avalie a probabilidade (P) e a severidade (S) considerando as medidas que serão adotadas.':''}</p>
    <div class="rlist">${RISCOS.map(([id,nm])=>{ const v=state.riscos[id]||{}, nv=nivel(v.p,v.s);
      const imA = ATIV.find(a=>(a.rk||[]).includes(id));
      return `<div class="rk ${v.on?'on':''}">${chk(`riscos.${id}.on`,nm,{cls:sugA.has(id)&&!v.on?'sug':'',tag:sugA.has(id)&&!v.on?'sugerido':''})}${v.on&&imA?`<div style="grid-column:1 / -1;padding-left:30px;font-size:13px;color:var(--bad)">Ativa a condição impeditiva Nº ${imA.n} – ${imA.cond}</div>`:''}
      ${v.on&&state.usarMatriz?`<div class="ev"><select id="${fid('riscos.'+id+'.p')}" data-k="riscos.${id}.p" data-num aria-label="Probabilidade">${opt('P',v.p)}</select><select id="${fid('riscos.'+id+'.s')}" data-k="riscos.${id}.s" data-num aria-label="Severidade">${opt('S',v.s)}</select><span class="lv ${nv?'lv-'+nv.c:''}">${nv?`${nv.label} · ${nv.n}`:'—'}</span></div>`:''}</div>`; }).join('')}</div>
    <h3 style="margin-top:20px">Outros riscos (não listados)</h3>
    <div class="stack">${state.riscosExtra.map((x,i)=>{ const nv=nivel(x.p,x.s); return `<div class="rx">
      ${inp(`riscosExtra.${i}.nome`,`Risco ${i+1}`,{req:1,ph:'Ex.: assalto, ataque de cão'})}
      ${state.usarMatriz?`<label class="fld"><span>Probabilidade</span><select id="${fid('riscosExtra.'+i+'.p')}" data-k="riscosExtra.${i}.p" data-num>${opt('P',x.p)}</select></label><label class="fld"><span>Severidade</span><select id="${fid('riscosExtra.'+i+'.s')}" data-k="riscosExtra.${i}.s" data-num>${opt('S',x.s)}</select></label><span class="lv ${nv?'lv-'+nv.c:''}" style="align-self:end;padding:12px 8px">${nv?`${nv.label} · ${nv.n}`:'—'}</span>`:''}
      ${inp(`riscosExtra.${i}.medida`,'Medida de controle',{req:1,cls:'mfull',ph:'Ex.: trabalho em dupla, evitar exposição de equipamentos, acionar 190'})}
      <button class="btn ghost" style="align-self:end" data-act="rmRisco" data-i="${i}" aria-label="Remover risco ${i+1}">Remover</button>
    </div>`; }).join('')}
    <div><button class="btn" data-act="addRisco">+ Incluir outro risco</button></div></div>
  </section>
  <section class="box"><h3>Matriz de risco 4×4</h3>
    ${chk('usarMatriz','Avaliar os riscos com a matriz')}
    ${state.usarMatriz?`
    <div class="mx" style="margin-top:10px">${mx}</div>
    <div style="display:flex;justify-content:space-between;font:600 12px/1 var(--f-display);color:var(--muted);margin-top:6px;padding-left:32px"><span>← Probabilidade (P) →</span><span>linhas: Severidade (S)</span></div>
    <div class="legend"><span class="lv lv-baixo">Baixo 1–3</span><span class="lv lv-moderado">Moderado 4–6</span><span class="lv lv-alto">Alto 8–9</span><span class="lv lv-critico">Crítico 12–16</span></div>
    <div class="cols" style="grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">
      <div class="scale">${[1,2,3,4].map(i=>`<b>P${i}</b><span>${P_LBL[i]}</span>`).join('')}</div>
      <div class="scale">${[1,2,3,4].map(i=>`<b>S${i}</b><span>${S_LBL[i]}</span>`).join('')}</div>
    </div>
    <p class="hint" style="margin:12px 0 0">Risco crítico impede a liberação. Risco alto aparece como alerta para o liberador.</p>`
    :`<p class="hint" style="margin:10px 0 0">Matriz desativada: a APR registra apenas a presença dos riscos, como no formulário em papel.</p>`}
  </section>
</div>`;
};

T.medidas = () => {
  const sg = sugeridos(), s=state;
  const lista = (list,base,set) => `<div class="ckgrid">${[...list].filter(([id])=>!OCULTOS.has(id)||get(`${base}.${id}`))
    .sort((a,b)=>(set.has(b[0])?1:0)-(set.has(a[0])?1:0))
    .map(([id,nm])=>chk(`${base}.${id}`,nm,{cls:set.has(id)&&!get(`${base}.${id}`)?'sug':'',tag:set.has(id)&&!get(`${base}.${id}`)?'sugerido':''})).join('')}</div>`;
  const aplicar = (k,base,set) => { const n=[...set].filter(x=>!s[base][x]).length; return n?`<button type="button" class="btn pri btn-sm" data-act="sugQ" data-q="${k}">Aplicar ${n} sugest${n>1?'ões':'ão'}</button>`:''; };
  const etapas = s.modoEtapas ? s.etapas.filter(e=>tx(e.med)) : [];
  return (s.modoEtapas ? quadro(1,'Medidas preventivas das etapas','',`<p class="hint">Só consulta: o que foi escrito em cada etapa na aba 02 Riscos.</p>
      ${etapas.length?`<div class="stack" style="gap:6px">${s.etapas.map((e,i)=>tx(e.med)?`<div class="etmed"><b>Etapa ${i+1}${tx(e.ativ)?' · '+esc(e.ativ):''}:</b> ${esc(tx(e.med).split('\n').map(tx).filter(Boolean).join('; '))}</div>`:'').join('')}</div>`:'<div class="empty">Nenhuma medida descrita nas etapas ainda.</div>'}`) : '')
   + quadro(s.modoEtapas?2:1,'Medidas de segurança','m2',`<p class="hint">Medidas gerais do serviço. Os itens “sugerido” vêm dos riscos das etapas.</p>${lista(MEDIDAS,'medidas',sg.m)}<div style="margin-top:10px">${inp('medidaOutra','Outras medidas',{area:1,rows:2})}</div>`,{acoes:aplicar('m','medidas',sg.m)})
   + quadro(s.modoEtapas?3:2,'EPI','m3',`<p class="hint">Equipamentos de proteção individual. Os itens “sugerido” vêm dos riscos das etapas.</p>${lista(EPI,'epi',sg.e)}<div style="margin-top:10px">${inp('epiOutro','Outros EPIs',{area:1,rows:2})}</div>`,{acoes:aplicar('e','epi',sg.e)})
   + quadro(s.modoEtapas?4:3,'EPC e ferramentas','m4',`<p class="hint">Equipamentos de proteção coletiva e ferramentas.</p>${lista(EPC,'epc',sg.c)}<div style="margin-top:10px">${inp('epcOutro','Outros EPC e ferramentas',{area:1,rows:2})}</div>`,{acoes:aplicar('c','epc',sg.c)});
};

T.equipe = () => {
  const tr = treinReq();
  return `
<div class="banner"><span>${tr.length?`<b>Treinamentos exigidos por esta APR:</b> ${tr.map(t=>TREIN[t]).join(', ')} para todos os executantes.`:'Nenhum treinamento específico exigido pelas atividades marcadas.'} Cada trabalhador assina a ciência da APR no próprio celular ou no aparelho do líder.</span></div>
<div class="wgrid">
  ${state.equipe.map((w,i)=>`<section class="box wk">
    <div style="display:flex;align-items:center;gap:8px"><h3 class="qt" style="flex:1">Executante ${i+1}</h3><button class="btn ghost" data-act="rmWorker" data-i="${i}" aria-label="Remover executante ${i+1}">Remover</button></div>
    ${inp(`equipe.${i}.nome`,'Nome',{req:1})}
    <div class="row">${inp(`equipe.${i}.cpf`,'CPF',{req:1,mask:'cpf',inputmode:'numeric',ph:'000.000.000-00'})}${inp(`equipe.${i}.mat`,'Matrícula')}</div>
    ${inp(`equipe.${i}.funcao`,'Função',{req:1})}
    <div class="fld"><span>Treinamentos válidos</span><div class="trs">${Object.keys(TREIN).map(t=>{ const has=w.trein?.[t], need=tr.includes(t);
      return `<label class="tr ${has?'has':need?'need':''}"><input type="checkbox" id="${fid(`equipe.${i}.trein.${t}`)}" data-k="equipe.${i}.trein.${t}" ${has?'checked':''}>${TREIN[t]}${need&&!has?' · exigido':''}</label>`; }).join('')}</div></div>
    ${chk(`equipe.${i}.aso`,'ASO válido e apto para a função')}
    <p class="hint" style="margin:0">${w.ass?`✓ Ciência assinada em ${fmtDH(w.em)}, na aba 07 Liberação da PT.`:'A assinatura de ciência é colhida na aba 07 Liberação da PT, no local, por quem libera.'}</p>
  </section>`).join('')}
  <button class="addcard" data-act="addWorker">+ Incluir executante</button>
</div>`;
};

function hospMapaImg(h,orig){
    const dest = fmtEnd(h.addr,false);
    if(!tx(h.addr.log)&&!tx(h.addr.cep)) return `<div class="map"><svg viewBox="0 0 320 180" aria-hidden="true"><rect width="320" height="180" fill="var(--brand-soft)"/></svg><div class="msg">Informe o endereço do hospital para ver a rota.</div></div>`;
    if(NO_ARTIFACT) return `<div class="map"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Rota até ${esc(h.nome||'o hospital')}" src="${mapsEmbed(orig,dest)}"></iframe></div>`;
    return `<div class="map"><svg viewBox="0 0 320 180" aria-hidden="true"><rect width="320" height="180" fill="var(--brand-soft)"/>
      <path d="M0 60H320M0 125H320M90 0V180M215 0V180" stroke="var(--surface)" stroke-width="9"/>
      <path d="M48 140 C 90 140, 90 62, 150 62 S 215 120, 268 44" fill="none" stroke="var(--brand)" stroke-width="4" stroke-dasharray="9 7" stroke-linecap="round"/>
      <circle cx="48" cy="140" r="8" fill="var(--signal)" stroke="var(--surface)" stroke-width="3"/>
      <circle cx="268" cy="44" r="10" fill="var(--bad)" stroke="var(--surface)" stroke-width="3"/><path d="M268 38v12M262 44h12" stroke="#fff" stroke-width="2.5"/></svg>
      <div class="msg">No app publicado aqui aparece o mapa do Google com a rota. Nesta pré-visualização, use o botão abaixo.</div></div>`;
}
function hospMapa(h,orig){
  const dest = fmtEnd(h.addr,false);
  return `${hospMapaImg(h,orig)}<div class="rinfo" style="margin-top:10px">
      ${tx(h.km)?`<span class="pill">${esc(h.km)} <small>km</small></span>`:''}${tx(h.min)?`<span class="pill">${esc(h.min)} <small>min de carro</small></span>`:''}
      ${tx(h.addr.log)||tx(h.addr.cep)?`<a class="btn" href="${mapsDir(orig,dest)}" target="_blank" rel="noopener">Abrir rota no Google Maps ↗</a>`:''}
    </div>`;
}
T.emerg = () => {
  const orig = origemRota(), H = state.emerg.hospitais;
  const rota = orig ? `Rota a partir ${origemTipo()==='local'?'do endereço da atividade':'do endereço da empresa (o endereço da atividade está em branco)'}: <b>${esc(orig)}</b>` : 'Informe o endereço da atividade ou da empresa na aba Identificação para traçar a rota.';
  return quadro(1,'Plano de resposta a emergências','g1',`<p class="hint">Texto padrão editável.</p>
    <div class="stack">${state.emerg.planos.map((p,i)=>inp(`emerg.planos.${i}`,`Plano ${'ABCD'[i]}`,{area:1,rows:2})).join('')}</div>`)
  + quadro(2,'Telefones de emergência','g2',`<p class="hint">Vêm do cadastro da empresa e podem ser alterados ou apagados conforme o local do serviço.</p>
    <div class="stack">
      ${state.emerg.tel.map((t,i)=>`<div class="tel">${inp(`emerg.tel.${i}.s`,'Serviço / contato')}${inp(`emerg.tel.${i}.t`,'Telefone',{type:'tel',inputmode:'tel'})}<button class="ibtn" style="align-self:end" data-act="rmTel" data-i="${i}" title="Remover telefone" aria-label="Remover telefone ${i+1}">${ICL}</button></div>`).join('')}
      <div><button class="btn" data-act="addTel">+ Telefone</button></div>
    </div>`)
  + H.map((h,i)=>quadro(i+3,`Hospital${H.length>1?` ${i+1}`:''} de referência`,'h'+i,`<p class="hint">${rota}</p>
    <div class="hq"><div class="stack">
      ${inp(`emerg.hospitais.${i}.nome`,'Hospital ou pronto-socorro',{req:1})}
      ${endBlock(`emerg.hospitais.${i}.addr`,'Endereço',{req:1})}
      <div class="row3">${inp(`emerg.hospitais.${i}.tel`,'Telefone do hospital',{type:'tel',inputmode:'tel'})}<div class="row3" style="gap:8px">${inp(`emerg.hospitais.${i}.km`,'Distância (km)',{inputmode:'decimal',map:1})}${inp(`emerg.hospitais.${i}.min`,'Tempo (min)',{inputmode:'numeric',map:1})}</div></div>
    </div><div class="mapslot">${hospMapa(h,orig)}</div></div>`,
    {id:`hosp-${i}`, acoes: H.length>1?`<button type="button" class="ibtn" data-act="rmHosp" data-i="${i}" title="Remover hospital" aria-label="Remover hospital ${i+1}">${ICL}</button>`:''})).join('')
  + `<button class="btn pri" data-act="addHosp">+ Incluir hospital</button>`;
};

const validadeTxt = (enc=true) => { const m=state.meta; if(!m.liberadaEm) return 'Execução: aguardando liberação';
  return `Liberada em ${fmtDH(m.validadeIni||m.liberadaEm)} · válida até ${fmtDH(m.validadeFim||state.lib.fim)}${enc&&m.encerradaEm?` · encerrada em ${fmtDH(m.encerradaEm)}`:''} (horário de Brasília)`; };
/* Linha de situação no topo da aba Liberação (rascunho) */
function topoLib(){
  const b=ED.P.filter(p=>p.b).length;
  const pr=elabAssinou() && !aprPend().length;
  return `<div class="sitl"><span><b>${pr?'Rascunho · pronto para liberar':b?`${b} pendência${b>1?'s':''} impede${b>1?'m':''} a liberação`:'Pronta para liberar'}</b>${pr&&b?` · ${b} pendência${b>1?'s':''} da liberação`:''} · o botão Liberar PT fica no fim desta aba</span>
    ${podeU('editar')?`<details class="cancel"><summary>Cancelar documento</summary><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input type="text" id="motivoCancel" placeholder="Motivo do cancelamento" style="flex:1;min-width:200px"><button class="btn" data-act="cancelar">Cancelar documento</button></div></details>`:''}</div>`;
}
/* Barra com o botão Liberar PT, no fim da aba */
function fimLib(){
  const b=ED.P.filter(p=>p.b).length;
  return `<div class="action fim"><div class="t"><b>${b?`${b} pendência${b>1?'s':''} impede${b>1?'m':''} a liberação`:'Pronta para liberar'}</b><span>${b?'Resolva os itens em vermelho. A liberação registra data e hora e bloqueia a edição da APR.':'Ao liberar, a validade começa agora e vai até 12 horas depois (horário de Brasília). A APR fica bloqueada para edição.'}</span></div>${podeU('liberar')?`<button class="btn pri big" data-act="liberar" ${b||!libAberta()?'disabled':''}>Liberar PT</button>`:'<span class="hint" style="margin:0">Seu perfil não libera PT. A conferência e a liberação são feitas pelo liberador.</span>'}</div>`;
}
/* Barra de ação depois da liberação (topo das abas Liberação e Encerramento) */
function actionBar(){
  const st=statusVis();
  if(st==='liberada'||st==='vencida') return `<div class="action"><div class="t"><b>${st==='vencida'?'PT vencida':'PT liberada'}</b><span>${validadeTxt()}. Qualquer integrante pode suspender o trabalho se as condições mudarem.</span></div>${podeU('suspender')?`${inp('lib.motivo','Motivo da suspensão',{req:1,cls:'',ph:'Ex.: início de chuva forte'})}<button class="btn warn" data-act="suspender">Suspender</button>`:''}</div>`;
  if(st==='suspensa'){ const u=(state.suspensoes||[]).slice(-1)[0];
    return `<div class="action"><div class="t"><b>PT suspensa</b><span>${u?`Suspensa em ${fmtDH(u.susp_em)} por ${esc(u.susp_por)}: ${esc(u.susp_motivo)}. `:''}${validadeTxt()}. Confira as condições no local antes de retomar.</span></div>${podeRetomar()?`<label class="fld"><span>Motivo da retomada / condições conferidas <b class="rq">*</b></span><input type="text" id="motivoRet" maxlength="500" placeholder="Ex.: chuva cessou, área e equipamentos conferidos"></label><button class="btn pri" data-act="retomar">Retomar trabalho</button>`:''}</div>`; }
  if(st==='cancelada') return `<div class="action"><div class="t"><b>Documento cancelado</b><span>Consulte o motivo no histórico, na aba Documento.</span></div></div>`;
  if(st==='encerrada') return `<div class="action"><div class="t"><b>PT encerrada</b><span>${validadeTxt()}. Documento finalizado. Consulte a aba Documento.</span></div></div>`;
  return '';
}

/* ---------- Pré-preenchimento com os dados do usuário logado ---------- */
const MEU = {
  elaborador: u=>({nome:u.nome,funcao:u.funcao||'',cpf:u.cpf||'',regTipo:u.reg_tipo==='CREA'?'CREA':'MTE',regNum:u.reg_num||''}),
  liberador:  u=>({nome:u.nome,funcao:u.funcao||'',cpf:u.cpf||''}),
  resp:       u=>({nome:u.nome,funcao:u.funcao||'',cpf:u.cpf||''})
};
const blocoObj = b => b==='resp' ? state.enc.resp : state.lib[b];
const blocoVazio = o => !tx(o.nome) && !tx(o.funcao) && !tx(o.cpf) && !tx(o.regNum);
function podeBloco(b){
  const st=state.meta.status, u=ED.usuario; if(!u || somenteLeitura()) return false;
  if(b==='elaborador') return elabAberto() && API.exigeRegistro(u.perfil);
  if(b==='liberador')  return libAberta();
  return ['liberada','suspensa'].includes(st) && podeU('encerrar');
}
function usarMeusDados(b){
  const o=blocoObj(b), u=ED.usuario;
  if(tx(o.nome).toLowerCase()!==tx(u.nome).toLowerCase()){ o.ass=null; o.em=null; }   /* assinatura era de outra pessoa */
  Object.assign(o, MEU[b](u)); save(); API.toast('Dados preenchidos com o seu cadastro.');
}
/* Preenche uma vez por abertura, só blocos totalmente vazios. Depois disso, só pelo botão "Usar meus dados". */
function preencherAuto(){
  const u=ED.usuario; if(!u) return; let mud=false;
  ['elaborador','liberador','resp'].forEach(b=>{
    if(ED.auto[b] || !podeBloco(b)) return; ED.auto[b]=true;
    const o=blocoObj(b); if(!blocoVazio(o)) return;
    if(b==='liberador' && tx(state.lib.elaborador.nome).toLowerCase()===tx(u.nome).toLowerCase()) return;
    Object.assign(o, MEU[b](u)); mud=true;
  });
  if(mud) save();
}
const btnMeus = b => podeBloco(b) ? `<button type="button" class="btn ghost btn-sm" data-act="meusDados" data-b="${b}">Usar meus dados</button>` : '';

/* O liberador assina por último: depois das condições, das conferências e de todos os executantes */
const libPodeAssinar = () => !(ED.P||[]).some(p=>p.b && ['l2','l3','l4'].includes(p.q));
const LOCK_LIB = '🔒 A assinatura do liberador abre depois que as condições estiverem respondidas com “Sim”, as conferências marcadas e todos os executantes tiverem assinado.';
function sigLiberador(){
  if(state.lib.liberador.ass) return sigBlock('lib.liberador.ass','Assinatura do liberador');
  const ok=libPodeAssinar();
  return `<div class="fld"><span>Assinatura do liberador</span><div class="sig"><button type="button" class="btn" data-act="sign" data-k="lib.liberador.ass" data-label="Assinatura do liberador" data-lock ${ok?'':'disabled'}>✍ Assinar${ok?'':' (por último)'}</button></div></div>
    <p class="hint lockn" data-lockn ${ok?'hidden':''}>${LOCK_LIB}</p>`;
}
T.lib = () => {
  const rq = requisitos(), ap = aprPend(), st = state.meta.status, rasc = st==='rascunho';
  const travaElab = rasc && !elabAberto(), travaLib = rasc && !libAberta();
  const avisoElab = !rasc ? '' : !podeElab()
      ? `<div class="banner"><span>O elaborador preenche e assina esta parte.</span></div>`
      : ap.length ? `<div class="banner warn"><span><b>Resolva ${ap.length} pendência(s) da APR (abas 01 a 06)</b> para preencher e assinar como elaborador.</span></div>`
      : '';
  const avisoLib = !rasc ? '' : !podeU('liberar')
      ? `<div class="banner"><span>A conferência e a liberação são feitas pelo liberador, no local.</span></div>`
      : !elabAssinou() || ap.length ? `<div class="banner warn"><span><b>Aguardando o elaborador concluir e assinar a APR.</b> A conferência e a liberação abrem depois da assinatura.</span></div>` : '';
  const fs = (trava, html) => trava ? `<fieldset disabled>${html}</fieldset>` : html;
  const impv = c => { const k=`lib.imped.${c.key}`, v=state.lib.imped?.[c.key]||'';
    return `<div class="impv ${v}"><div class="t">${c.titulo?`<span class="ctit">${esc(c.titulo)}</span>`:'<span class="ctit">Verificação geral</span>'}<b>${esc(c.perg)}</b>${c.orient?`<small>${esc(c.orient)}</small>`:''}${v==='presente'?`<small class="sn"><b>Se “Não”:</b> ${esc(c.seNao)}</small>`:''}</div><div class="seg" role="radiogroup" aria-label="${esc(c.perg)}">
      <label><input type="radio" name="${fid(k)}" id="${fid(k)}_a" data-k="${k}" value="ausente" ${v==='ausente'?'checked':''}><span>Sim</span></label>
      <label class="p"><input type="radio" name="${fid(k)}" id="${fid(k)}_p" data-k="${k}" value="presente" ${v==='presente'?'checked':''}><span>Não</span></label></div></div>`; };
  const pronto = rasc && elabAssinou() && !ap.length;
  const bannerPronto = pronto ? `<div class="banner pronto"><span class="ic">✓</span><span style="flex:1;min-width:240px"><b class="t">Documento em rascunho · APR concluída e assinada pelo elaborador</b>O liberador já está apto a iniciar a liberação: responder às condições impeditivas, marcar as conferências, colher a assinatura dos executantes e assinar por último. Qualquer alteração nas abas 01 a 06 apaga todas as assinaturas e conferências.</span></div>` : '';
  const exRow = (w,i) => { const nm=tx(w.nome)||`Executante ${i+1}`, lbl=esc(`Ciência da APR – ${nm}`);
    return `<div class="exr"><div><b>${esc(nm)}</b><small>${esc(tx(w.funcao)||'Função não informada')}${tx(w.cpf)?` · CPF ${esc(w.cpf)}`:''}</small></div>
      <div class="exs">${w.ass?`<img src="${w.ass}" data-sig="${w.ass}" alt="Assinatura de ${esc(nm)}"><span class="when">Assinado em<br>${fmtDH(w.em)}</span>${rasc?`<button type="button" class="btn ghost btn-sm" data-act="sign" data-k="equipe.${i}.ass" data-label="${lbl}">Refazer</button>`:''}`
        :`<button type="button" class="btn pri" data-act="sign" data-k="equipe.${i}.ass" data-label="${lbl}">✍ Colher assinatura</button>`}</div>
      <span class="qs ${w.ass?'ok':'pd'}">${w.ass?'✓ Assinado':'Falta assinar'}</span></div>`; };
  return `${rasc?topoLib():''}${bannerPronto}
${quadro(1,'Elaborado por','l1',`${avisoElab}${fs(travaElab, `<div class="form-grid">${inp('lib.elaborador.nome','Nome',{req:1,cls:'c4'})}${inp('lib.elaborador.funcao','Função',{cls:'c4',ph:'Técnico ou Engenheiro de Segurança'})}
    ${inp('lib.elaborador.cpf','CPF',{cls:'c4',mask:'cpf',inputmode:'numeric',ph:'000.000.000-00'})}
    <label class="fld c4"><span>Registro <b class="rq">*</b></span><select id="f_lib_elaborador_regTipo" data-k="lib.elaborador.regTipo"><option value="MTE" ${state.lib.elaborador.regTipo==='MTE'?'selected':''}>MTE (técnico)</option><option value="CREA" ${state.lib.elaborador.regTipo==='CREA'?'selected':''}>CREA (engenheiro)</option></select></label>
    ${inp('lib.elaborador.regNum',`Nº do registro ${state.lib.elaborador.regTipo}`,{req:1,cls:'c8',ph:state.lib.elaborador.regTipo==='CREA'?'Ex.: 5061234567/SP':'Ex.: SP/012345'})}</div>
  <div style="margin-top:10px">${sigBlock('lib.elaborador.ass','Assinatura do elaborador')}</div>`)}`,{acoes:btnMeus('elaborador')})}
<div class="sep">Liberação da PT · preenchida pelo liberador no local</div>
${avisoLib}
${fs(travaLib, quadro(2,'Condições impeditivas – verificação no local','l2',`<p class="hint">A resposta “Sim” libera; a resposta “Não” impede o início ou exige a suspensão imediata.</p><div class="stack" style="gap:6px">${impedimentos().map(impv).join('')}</div>`)
 + quadro(3,'Requisitos e conferências no local','l3',`<div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px">
    <div><h3 class="sub">Requisitos das atividades</h3><div class="list">${rq.length?rq.map(r=>chk(`lib.req.${r.key}`,`<b>${r.a.n}</b> · ${r.txt}`)).join(''):'<div class="empty">Nenhuma atividade crítica marcada.</div>'}</div></div>
    <div><h3 class="sub">Conferências no local</h3><div class="list">${GERAIS.map(g=>chk(`lib.gerais.${g[0]}`,g[1])).join('')}</div></div></div>`)
 + quadro(4,'Executantes','l4',`<p class="hint">Cada executante lê a APR com quem está liberando e assina a ciência. Os executantes são cadastrados na aba 05 Equipe pelo elaborador.</p>
    ${state.equipe.length?`<div class="exl">${state.equipe.map(exRow).join('')}</div>`:'<div class="empty">Nenhum executante cadastrado na aba 05 Equipe.</div>'}`)
 + quadro(5,'Validade da PT','',`<div class="valid">${state.meta.liberadaEm?`<b>${validadeTxt(false)}</b>`:'A validade começa no momento em que o liberador clicar em <b>Liberar PT</b> e vale por até <b>12 horas</b> (horário de Brasília). Pode terminar no dia seguinte.'}</div>`)
 + quadro(6,'Liberado por','l6',`<div class="form-grid">${inp('lib.liberador.nome','Nome',{req:1,cls:'c4'})}${inp('lib.liberador.funcao','Função',{cls:'c4',ph:'Responsável pela área'})}${inp('lib.liberador.cpf','CPF',{req:1,cls:'c4',mask:'cpf',inputmode:'numeric',ph:'000.000.000-00'})}</div>
    <div style="margin-top:10px">${sigLiberador()}</div>`,{acoes:btnMeus('liberador')}))}
${rasc?fimLib():''}`;
};

/* Barra com o botão Encerrar PT, no fim da aba */
function fimEnc(){
  const st=statusVis(), n=(ED.PE||[]).length, ok=!n;
  if(!['liberada','vencida','suspensa'].includes(st)) return '';
  return `<div class="action fim"><div class="t"><b>${ok?'Pronta para encerrar':`${n} pendência${n>1?'s':''} impede${n>1?'m':''} o encerramento`}</b><span>${ok?'O horário do encerramento é registrado no momento do clique (horário de Brasília).':'Marque todos os itens, informe o responsável (nome e CPF válido) e assine.'}</span></div>${podeU('encerrar')?`<button class="btn pri big" data-act="encerrar" ${ok?'':'disabled'}>Encerrar PT</button>`:''}</div>`;
}
T.enc = () => {
  const st = statusVis(), pode = ['liberada','vencida','suspensa'].includes(st) && podeU('encerrar');
  const ok = !ED.PE.length;
  return `
${st==='rascunho'?`<div class="banner warn">O encerramento fica disponível depois que a PT for liberada.</div>`:''}
<fieldset ${pode?'':'disabled'}>
${quadro(1,'Conferência final','e1',`<p class="hint">Conferência final antes de devolver a área.</p><div class="list">${ENC.map(x=>chk(`enc.chk.${x[0]}`,x[1])).join('')}</div>`)}
${quadro(2,'Situação do serviço','e2',`<div class="form-grid">
    <label class="fld c4"><span>Situação <b class="rq">*</b></span><select id="f_enc_situacao" data-k="enc.situacao"><option value="concluido" ${state.enc.situacao==='concluido'?'selected':''}>Concluído</option><option value="nao" ${state.enc.situacao==='nao'?'selected':''}>Não concluído</option></select></label>
    ${inp('enc.obs',state.enc.situacao==='nao'?'Observações – motivo de não ter sido concluído':'Observações',{area:1,rows:3,cls:'c8',req:state.enc.situacao==='nao'})}
  </div>`)}
${quadro(3,'Responsável pelo encerramento','e3',`<div class="form-grid">${inp('enc.resp.nome','Nome',{req:1,cls:'c4'})}${inp('enc.resp.funcao','Função',{cls:'c4'})}${inp('enc.resp.cpf','CPF',{req:1,cls:'c4',mask:'cpf',inputmode:'numeric',ph:'000.000.000-00'})}</div>
  <div style="margin-top:10px">${sigBlock('enc.resp.ass','Assinatura')}</div>`,{acoes:btnMeus('resp')})}
${fimEnc()}
</fieldset>`;
};

function periodoTxt(st=state){
  const m=st.meta, el=st.id.elaboracao?`Elaborada em ${fmtData(st.id.elaboracao)}`:'';
  const ex = m.liberadaEm ? `Executada em ${fmtDH(m.validadeIni||m.liberadaEm)} até ${fmtDH(m.validadeFim||st.lib.fim)} (horário de Brasília)` : 'Execução: aguardando liberação';
  const pv = tx(st.id.previsao) ? ` · Previsão de execução: ${fmtData(st.id.previsao)}` : '';
  return [el,ex].filter(Boolean).join(' · ')+pv;
}
function docEtapas(){
  const E=state.etapas, res=resumoRiscos();
  const rows = E.map((e,i)=>{ const rs=Math.max(1,e.riscos.length), med=tx(e.med).split('\n').map(tx).filter(Boolean).map(m=>`<div>${esc(m)}</div>`).join('');
    return (e.riscos.length?e.riscos:[null]).map((r,k)=>{ const nv=r&&nivel(r.p,r.s);
      return `<tr>${k===0?`<td rowspan="${rs}">${i+1} – ${esc(e.ativ)}</td><td rowspan="${rs}" class="just">${esc(e.passo)}</td>`:''}
        <td>${r?esc(nomeRisco(r)):'—'}</td><td class="ctr">${r&&r.p?P_LBL[r.p]:'—'}</td><td class="ctr">${r&&r.s?S_LBL[r.s]:'—'}</td>
        <td class="ctr">${nv?`<span class="lvd lv-${nv.c}">${nv.label} (${nv.n})</span>`:'—'}</td>${k===0?`<td rowspan="${rs}">${med||'—'}</td>`:''}</tr>`; }).join(''); }).join('');
  return `<div class="sh">Descrição das atividades</div>
  <table class="etd"><tr><th rowspan="2" style="width:15%">Atividade</th><th rowspan="2" style="width:23%">Passo a passo</th><th rowspan="2">Riscos</th><th colspan="3" class="ctr">Avaliação de riscos</th><th rowspan="2" style="width:22%">Medidas preventivas</th></tr>
    <tr><th class="ctr" style="width:9%">Probabilidade (P)</th><th class="ctr" style="width:9%">Severidade (S)</th><th class="ctr" style="width:10%">Nível</th></tr>
    ${rows||'<tr><td colspan="7">&nbsp;</td></tr>'}</table>
  <div class="sh">Riscos potenciais (resumo)</div>
  <table class="cen"><tr><th>Risco</th><th style="width:20%">Maior nível</th><th style="width:18%">Etapas</th></tr>
    ${res.map(r=>`<tr><td>${esc(r.nome)}</td><td class="ctr">${r.nv?`${r.nv.label} (${r.nv.n})`:'—'}</td><td class="ctr">${r.et.join(', ')}</td></tr>`).join('')||'<tr><td colspan="3">&nbsp;</td></tr>'}</table>`;
}

T.doc = () => {
  const s=state, rk=riscosOn(), x=b=>`<span class="bx">${b?'X':''}</span>`;
  const sel = (list,base)=>list.filter(([id])=>get(`${base}.${id}`)).map(([,n])=>`<div>☑ ${esc(n)}</div>`).join('');
  const tels = s.emerg.tel.filter(t=>t.s.trim()||t.t.trim());
  const sigImg = (a,em) => a?`<div class="sigcell"><img class="simg" src="${a}" data-sig="${a}" alt="Assinatura"><div class="note">${fmtDH(em)}</div></div>`:'';
  return `
<div class="banner no-print"><span style="flex:1;min-width:220px">O QR code leva à página de verificação, que mostra a situação atualizada da PT para quem estiver no local.</span><button class="btn pri" data-act="pdf">Baixar PDF</button><button class="btn" data-act="imprimir">Imprimir</button></div>
<div class="docwrap"><article class="sheet" lang="pt-BR">
  <div class="tt"><div class="l">APRFlow</div><div><h1>ANÁLISE PRELIMINAR DE RISCOS / PERMISSÃO DE TRABALHO</h1></div>
    <div class="r"><div class="qr"><div id="qrbox"></div><div class="qri"><div>Nº ${esc(s.meta.numero)}</div>${tx(s.meta.codigo)?`<div class="${tx(s.meta.codigo).length>16?'qrs':''}">Cód. ${esc(s.meta.codigo)}</div>`:''}<div>Rev. ${esc(s.meta.rev)}</div><div>Situação: <b class="st-${statusVis()}">${statusVis().toUpperCase()}</b></div></div></div></div></div>
  ${(()=>{ const cli=[[ 'Razão social', s.id.cliRazao],['CNPJ', s.id.cliCnpj],['Local do serviço', s.id.local],['Endereço', fmtEnd(s.id.endLocal)]].filter(([,v])=>tx(v));
    const bloco=(t,L)=>`<table class="emp"><tr><th colspan="2" class="faixa">${t}</th></tr>${L.map(([k,v])=>`<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
    const ex=bloco('Empresa executante',[['Razão social',s.id.empresa],['CNPJ',s.id.cnpj],...(fmtEnd(s.id.endEmpresa)?[['Endereço',fmtEnd(s.id.endEmpresa)]]:[])]);
    return `<div class="emps ${cli.length?'':'um'}">${ex}${cli.length?bloco('Empresa da atividade (cliente)',cli):''}</div>`; })()}
  <table class="emp"><tr><th colspan="2" class="faixa">Serviço</th></tr>
    <tr><th>Serviço a ser executado</th><td>${esc(s.id.servico)}</td></tr>
    <tr><th>Período</th><td>${periodoTxt()}</td></tr>
    ${tx(s.id.os)?`<tr><th>Ordem de serviço</th><td>${esc(s.id.os)}</td></tr>`:''}
  </table>
  ${s.modoEtapas?docEtapas():`<div class="sh">Riscos potenciais</div>
  <table><tr><th>Risco</th>${s.usarMatriz?'<th class="ctr" style="width:9%">P</th><th class="ctr" style="width:9%">S</th><th class="ctr" style="width:16%">Nível</th>':''}</tr>
    ${rk.map(r=>{ const v=s.riscos[r[0]], nv=nivel(v.p,v.s); return `<tr><td>${esc(r[1])}</td>${s.usarMatriz?`<td class="ctr">${v.p||'—'}</td><td class="ctr">${v.s||'—'}</td><td class="ctr">${nv?`${nv.label} (${nv.n})`:'—'}</td>`:''}</tr>`; }).join('')}
    ${s.riscosExtra.map(x=>{ const nv=nivel(x.p,x.s); return `<tr><td>${esc(x.nome)}<div class="note">Medida: ${esc(x.medida)}</div></td>${s.usarMatriz?`<td class="ctr">${x.p||'—'}</td><td class="ctr">${x.s||'—'}</td><td class="ctr">${nv?`${nv.label} (${nv.n})`:'—'}</td>`:''}</tr>`; }).join('')}
  </table>`}
  <div class="sh">Identificação de atividades críticas e condições especiais</div>
  <div class="ag">${ATIV.map(a=>`<div>${x(s.ativ[a.id])}<span><b>${a.n}</b> ${a.nome}</span></div>`).join('')}</div>
  ${s.outras.trim()?`<div class="pr"><b>Outras situações:</b> ${esc(s.outras)}</div>`:''}
  <div class="sh">Condições impeditivas</div>
  <table><tr><th>Verificação no local</th><th class="ctr" style="width:14%">Resposta</th></tr>
    ${impedimentos().map(c=>{ const v=s.lib.imped?.[c.key]; const a=c.a;
      return `<tr><td>${c.titulo?`<div class="note">${esc(c.titulo)}${a&&a.tipo==='permissao'?` · ${a.doc} nº ${esc(s.permNum[a.id]||'—')}`:''}</div>`:''}<b>${esc(c.perg)}</b>${c.orient?`<div class="note">${esc(c.orient)} <b>Se “Não”:</b> ${esc(c.seNao)}</div>`:''}</td><td class="ctr">${v==='ausente'?'<span class="ok">Sim</span>':v==='presente'?'<b style="color:#c2382c">NÃO</b>':'—'}</td></tr>`; }).join('')}
  </table>
  ${ativOn().some(a=>a.tipo==='controle')?`<div class="sh">Requisitos das atividades críticas</div><div class="pr">${ativOn().filter(a=>a.tipo==='controle').map(a=>`<p><b>Nº ${a.n} – ${a.nome}:</b> ${a.regra}</p>`).join('')}</div>`:''}
  <div class="sh">Medidas de segurança obrigatórias</div><div class="cl">${sel(MEDIDAS,'medidas')}${(s.modoEtapas?[]:s.riscosExtra).filter(x=>(x.medida||'').trim()).map(x=>`<div>☑ ${esc(x.medida)}</div>`).join('')}${s.medidaOutra.trim()?`<div>☑ ${esc(s.medidaOutra)}</div>`:''}</div>
  <div class="sh">EPI</div><div class="cl">${sel(EPI,'epi')}${s.epiOutro.trim()?`<div>☑ ${esc(s.epiOutro)}</div>`:''}</div>
  <div class="sh">EPC e ferramentas</div><div class="cl">${sel(EPC,'epc')}${s.epcOutro.trim()?`<div>☑ ${esc(s.epcOutro)}</div>`:''}</div>
  <div class="sh">Plano de resposta a emergências</div>
  <div class="pr">${s.emerg.planos.map((p,i)=>`<p><b>Plano ${'ABCD'[i]}:</b> ${esc(p)}</p>`).join('')}</div>
  <table class="cen"><tr><th>Telefones de emergência</th><th style="width:30%">Telefone</th></tr>
    ${tels.length?tels.map(t=>`<tr><td>${esc(t.s)}</td><td>${esc(t.t)}</td></tr>`).join(''):'<tr><td>&nbsp;</td><td></td></tr><tr><td>&nbsp;</td><td></td></tr>'}
  </table>
  <table class="cen"><tr><th>Hospital de referência</th><th>Endereço</th><th style="width:16%">Telefone</th><th style="width:10%">Distância</th><th style="width:10%">Tempo</th></tr>
    ${s.emerg.hospitais.filter(h=>tx(h.nome)||fmtEnd(h.addr)).map(h=>`<tr><td>${esc(h.nome)}</td><td>${esc(fmtEnd(h.addr))}</td><td>${esc(h.tel)}</td><td>${h.km?esc(h.km)+' km':''}</td><td>${h.min?esc(h.min)+' min':''}</td></tr>`).join('')||'<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>'}
  </table>
  ${origemRota()?`<div class="note" style="margin:-6px 0 10px">Rota a partir de: ${esc(origemRota())}</div>`:''}
  <div class="sh">Trabalhadores executantes</div>
  <table class="cen"><tr><th>Nome</th><th>Função</th><th>CPF</th><th>Matrícula</th><th>Treinamentos</th><th>ASO</th><th style="width:20%">Ciência</th></tr>
    ${s.equipe.map(w=>`<tr><td>${esc(w.nome)}</td><td>${esc(w.funcao)}</td><td>${esc(w.cpf)}</td><td>${esc(w.mat)}</td><td>${Object.keys(TREIN).filter(t=>w.trein?.[t]).map(t=>TREIN[t]).join(', ')||'—'}</td><td>${w.aso?'Apto':'—'}</td><td class="sigtd">${sigImg(w.ass,w.em)}</td></tr>`).join('')}
  </table>
  <div class="sh">Permissão de trabalho – liberação</div>
  <table>
    <tr><th style="width:22%">Validade</th><td colspan="3">${validadeTxt()}</td></tr>
    <tr><th>Conferências no local</th><td colspan="3">${[...requisitos().map(r=>[s.lib.req[r.key],r.txt]),...GERAIS.map(g=>[s.lib.gerais[g[0]],g[1]])].map(([o,t])=>`<div>${o?'<span class="ok">✓</span>':'☐'} ${t}</div>`).join('')}</td></tr>
    <tr><th>Elaborado por</th><td>${esc(s.lib.elaborador.nome)}<div class="note">${esc(s.lib.elaborador.funcao)}</div>${tx(s.lib.elaborador.cpf)?`<div class="note">CPF ${esc(s.lib.elaborador.cpf)}</div>`:''}${tx(s.lib.elaborador.regNum)?`<div class="note">Registro ${esc(s.lib.elaborador.regTipo)} nº ${esc(s.lib.elaborador.regNum)}</div>`:''}</td><th style="width:16%">Liberado por</th><td>${esc(s.lib.liberador.nome)}<div class="note">${esc(s.lib.liberador.funcao)}</div>${tx(s.lib.liberador.cpf)?`<div class="note">CPF ${esc(s.lib.liberador.cpf)}</div>`:''}</td></tr>
    <tr><th>Assinatura</th><td class="sigtd">${sigImg(s.lib.elaborador.ass,s.lib.elaborador.em)}</td><th>Assinatura</th><td class="sigtd">${sigImg(s.lib.liberador.ass,s.lib.liberador.em)}</td></tr>
  </table>
  ${s.suspensoes?.length?`<div class="sh">Suspensões e retomadas</div>
  <table class="cen"><tr><th style="width:12%">Suspensa em</th><th style="width:14%">Por</th><th>Motivo da suspensão</th><th style="width:12%">Retomada em</th><th style="width:14%">Por</th><th>Motivo da retomada</th></tr>
    ${s.suspensoes.map(x=>`<tr><td>${fmtDH(x.susp_em)}</td><td>${esc(x.susp_por)}</td><td style="text-align:left">${esc(x.susp_motivo)}</td>${x.ret_em?`<td>${fmtDH(x.ret_em)}</td><td>${esc(x.ret_por)}</td><td style="text-align:left">${esc(x.ret_motivo)}</td>`:`<td colspan="3">${s.meta.status==='encerrada'?'Não retomada (encerrada suspensa)':'Aguardando retomada'}</td>`}</tr>`).join('')}
  </table>`:''}
  <div class="sh">Encerramento</div>
  <table>
    <tr><th style="width:22%">Conferências</th><td colspan="3">${ENC.map(e=>`<div>${s.enc.chk[e[0]]?'<span class="ok">✓</span>':'☐'} ${e[1]}</div>`).join('')}</td></tr>
    <tr><th>Situação</th><td>${s.meta.encerradaEm?(s.enc.situacao==='concluido'?'Concluído':'Não concluído'):'—'}</td><th style="width:16%">Encerrada em</th><td>${fmtDH(s.meta.encerradaEm)}</td></tr>
    <tr><th>Responsável</th><td>${esc(s.enc.resp.nome)}${tx(s.enc.resp.funcao)?`<div class="note">${esc(s.enc.resp.funcao)}</div>`:''}${tx(s.enc.resp.cpf)?`<div class="note">CPF ${esc(s.enc.resp.cpf)}</div>`:''}</td><th>Assinatura</th><td class="sigtd">${sigImg(s.enc.resp.ass,s.enc.resp.em)}</td></tr>
    ${s.enc.obs.trim()?`<tr><th>Observações</th><td colspan="3">${esc(s.enc.obs)}</td></tr>`:''}
  </table>
  <div class="pr decl" style="border-top:1px solid var(--paper-line);margin-top:10px">
    ${DECLARACAO.map((p,i)=>i===DECLARACAO.length-1?`<p><b>${p}</b></p>`:`<p>${p}</p>`).join('')}
  </div>
  ${s.meta.eventos.length?`<div class="sh">Histórico</div><table>${s.meta.eventos.map(e=>`<tr><td style="width:24%">${fmtDH(e.em)}</td><td>${esc(e.txt)}</td></tr>`).join('')}</table>`:''}
</article></div>`;
};

/* ---------- Render ---------- */
const $ = id => document.getElementById(id);
function renderTab(){
  const p=$('panel'), top=p.scrollTop, st=state.meta.status;
  const ro = somenteLeitura();
  const locked = cur!=='doc' && (ro || (st!=='rascunho' && cur!=='enc') || (soLiberacao() && cur!=='lib'));
  if(cur==='lib' || cur==='enc') preencherAuto();
  ED.P = pend(); ED.PE = pendEnc();
  let h = '';
  if((cur==='lib' || cur==='enc') && st!=='rascunho') h += actionBar();
  else if(locked && st==='rascunho') h += `<div class="banner"><span>${soLiberacao()?'Somente consulta: o liberador não altera a APR. A conferência e a liberação ficam na aba Liberação da PT, depois da assinatura do elaborador.':'Somente leitura: seu perfil não edita documentos.'}</span></div>`;
  else if(locked && cur!=='enc' && cur!=='lib') h += `<div class="banner ok"><span>PT ${statusVis()} · A APR fica bloqueada para edição. Para alterar, use “Duplicar” e emita um novo documento.</span></div>`;
  h += locked ? `<fieldset disabled>${T[cur]()}</fieldset>` : T[cur]();
  p.innerHTML = h; p.scrollTop = top;
  if(cur==='doc') desenharQR();
  if(window.Assin) Assin.aplicar(p);
  renderChrome();
}
const ST_LBL = {rascunho:'Rascunho',liberada:'Liberada',suspensa:'Suspensa',encerrada:'Encerrada',vencida:'Vencida',cancelada:'Cancelada'};
function renderChrome(){
  const P=pend(), PE=pendEnc(), st=statusVis(), rasc=state.meta.status==='rascunho', bl=P.filter(p=>p.b);
  ED.P=P; ED.PE=PE;
  /* atualiza os sinais dos quadros sem redesenhar a aba */
  document.querySelectorAll('[data-qs]').forEach(el=>{ const t=document.createElement('span'); t.innerHTML=qStatus(el.dataset.qs); el.replaceWith(t.firstChild); });
  /* e as barras de liberar / encerrar no fim da aba */
  const fim=document.querySelector('#panel .action.fim'), hf = !fim ? '' : cur==='lib' ? (rasc?fimLib():'') : cur==='enc' ? fimEnc() : '';
  if(fim && hf && fim.outerHTML!==hf){ const t=document.createElement('div'); t.innerHTML=hf; fim.replaceWith(t.firstChild); }
  const bl2=document.querySelector('#panel [data-lock]');
  if(bl2){ const ok=libPodeAssinar(); if(!bl2.closest('fieldset[disabled]')) bl2.disabled=!ok; bl2.textContent=`✍ Assinar${ok?'':' (por último)'}`; const n=document.querySelector('#panel [data-lockn]'); if(n) n.hidden=ok; }
  const sl=document.querySelector('#panel .sitl>span');
  if(sl && rasc){ const t=document.createElement('div'); t.innerHTML=topoLib(); sl.replaceWith(t.querySelector('.sitl>span')); }
  $('docno').textContent = state.meta.numero;
  const chip=$('chip'); chip.className='chip '+st; chip.textContent=ST_LBL[st];
  const nTab = k => k==='enc' ? (rasc?0:PE.length) : P.filter(p=>p.b&&p.tab===k).length;
  const nTot = rasc ? bl.length : (['liberada','suspensa','vencida'].includes(st) ? PE.length : 0);
  $('pendbtn').textContent = nTot ? `${nTot} pendência${nTot>1?'s':''} · Ver por aba` : 'Ver por aba';
  $('tabs').innerHTML = TABS.map(([k,l],i)=>{ const n=rasc||k==='enc'?nTab(k):0;
    return `<button class="tab" role="tab" data-act="tab" data-tab="${k}" aria-selected="${k===cur}"><span class="n">${pad(i+1)}</span><span class="lbl">${l}</span>${n?`<span class="bd">${n}</span>`:''}</button>`; }).join('');
  const ix = TABS.findIndex(t=>t[0]===cur);
  $('step').textContent = `${ix+1} / ${TABS.length}`;
  $('bPrev').disabled = ix===0; $('bNext').disabled = ix===TABS.length-1;
  const maxNv = state.usarMatriz ? [...riscosOn().map(r=>nivel(state.riscos[r[0]].p,state.riscos[r[0]].s)),...state.riscosExtra.map(x=>nivel(x.p,x.s))].filter(Boolean).sort((a,b)=>b.n-a.n)[0] : null;
  const itens = (L,w) => L.length?`<ul class="det${w?' w':''}">${L.map(p=>`<li>${esc(p.msg)}</li>`).join('')}</ul>`:'';
  const abas = TABS.filter(t=>t[0]!=='doc').map(([k,l],i)=>{
    const lista = k==='enc' ? PE : P.filter(p=>p.tab===k), b=lista.filter(p=>p.b), w=lista.filter(p=>!p.b);
    const sinal = k==='enc'&&rasc ? '<span class="qs na">após liberar</span>'
      : b.length ? `<span class="qs pd">${b.length}</span>` : w.length ? `<span class="qs wa">${w.length} alerta${w.length>1?'s':''}</span>` : '<span class="qs ok">✓</span>';
    return `<li><button class="ta ${k===cur?'cur':''}" data-act="tab" data-tab="${k}"><span class="tn">${pad(i+1)}</span><span>${l}</span>${sinal}</button>${k===cur&&!(k==='enc'&&rasc)?itens(b)+itens(w,true):''}</li>`; }).join('');
  const depois = !rasc ? `<h3>Validade</h3><div class="valid">${validadeTxt()}</div>
      ${['liberada','suspensa','vencida'].includes(st)?`<h3>Encerramento</h3>${PE.length?`<div class="gate no">${PE.length} pendência(s) para encerrar</div>${itens(PE)}`:'<div class="gate yes">Pronto para encerrar</div>'}`:''}` : '';
  $('side').innerHTML = `
    <h3>Documento</h3>
    <dl class="kv"><dt>Número</dt><dd>${esc(state.meta.numero)}</dd><dt>Situação</dt><dd><b>${chip.textContent}</b></dd>
      <dt>Serviço</dt><dd>${esc(state.id.servico.slice(0,70))||'—'}${state.id.servico.length>70?'…':''}</dd>
      ${maxNv?`<dt>Maior risco</dt><dd><span class="lv lv-${maxNv.c}">${maxNv.label} · ${maxNv.n}</span></dd>`:''}</dl>
    ${ativOn().length?`<h3>Atividades críticas</h3><div class="mini">${ativOn().map(a=>`<span title="${esc(a.nome)}">${svg(a.icon)}${a.n}</span>`).join('')}</div>`:''}
    ${rasc?`<h3>Preenchimento por aba</h3><ul class="abas">${abas}</ul>
    <h3>Liberação</h3><div class="gate ${bl.length?'no':'yes'}">${bl.length?`Bloqueada: ${bl.length} pendência${bl.length>1?'s':''}`:'Liberação permitida'}</div>
    <p class="hint" style="margin:8px 0 0">Toque numa aba para ver o que falta nela.</p>`:depois}
    <div class="mini-close" style="margin-top:16px"><button class="btn pendbtn" data-act="pend">Fechar</button></div>`;
}
function go(k){ cur=k; try{ localStorage.setItem(KEY+'-tab',k); }catch(e){} $('side').classList.remove('open'); $('panel').scrollTop=0; renderTab(); const t=document.querySelector(`.tab[data-tab="${k}"]`); t&&t.scrollIntoView({block:'nearest',inline:'nearest'}); }

/* ---------- Eventos ---------- */
const EDROOT = document.getElementById('vEdit');
EDROOT.addEventListener('input', e=>{
  const el=e.target, k=el.dataset.k; if(!k) return;
  let v = el.type==='checkbox' ? el.checked : el.value;
  if('num' in el.dataset) v = v===''?null:Number(v);
  if(el.dataset.mask){ const M=MASK[el.dataset.mask]; v=M.fmt(v); el.value=v;
    const done=v.length>=M.len, bad=done&&!M.ok(v); el.classList.toggle('invalid',bad);
    const er=el.parentElement.querySelector('.err'); if(er) er.hidden=!bad;
    if(el.dataset.mask==='cep'){ const base=k.replace(/\.cep$/,''), d=v.replace(/\D/g,''); set(k,v); if(d.length===8) buscarCep(base,d); else setSt(base,'Digite o CEP para preencher o endereço, ou preencha à mão.'); renderChrome(); return; } }
  set(k,v);
  const mt=k.match(/^etapas\.(\d+)\.ativ$/); if(mt){ const t=el.closest('.etapa')?.querySelector('.et-t'); if(t) t.textContent=tx(v); }
  if(el.type==='checkbox' || el.type==='radio' || el.tagName==='SELECT') renderTab(); else renderChrome();
});
EDROOT.addEventListener('change', e=>{ const k=e.target.dataset.k||''; const m=k.match(/^emerg\.hospitais\.(\d+)\./);
  if(m && 'map' in e.target.dataset){ const slot=document.querySelector(`#hosp-${m[1]} .mapslot`); if(slot) slot.innerHTML=hospMapa(state.emerg.hospitais[+m[1]],origemRota()); } });
let armed = null;
EDROOT.addEventListener('click', e=>{
  const b=e.target.closest('[data-act]'); if(!b || !state) return;
  const a=b.dataset.act;
  if(a==='tab') return go(b.dataset.tab);
  if(a==='prev'||a==='next'){ const i=TABS.findIndex(t=>t[0]===cur)+(a==='next'?1:-1); if(TABS[i]) go(TABS[i][0]); return; }
  if(a==='pend') return $('side').classList.toggle('open');
  if(['sugestoes','addWorker','rmWorker','addImp','rmImp','addRisco','rmRisco','addHosp','rmHosp','addTel','rmTel','addEtapa','upEtapa','addRiscoEt','rmRiscoEt','sugMed'].includes(a) && podeElab()) invalidarAssElab();
  if(a==='ativ'){ if(somenteLeitura()||soLiberacao()||state.meta.status!=='rascunho') return; state.ativ[b.dataset.id]=!state.ativ[b.dataset.id]; invalidarAssElab(); save(); return renderTab(); }
  if(a==='sugestoes'){ const sg=sugeridos(); sg.m.forEach(x=>state.medidas[x]=true); sg.e.forEach(x=>state.epi[x]=true); sg.c.forEach(x=>state.epc[x]=true); save(); return renderTab(); }
  if(a==='addWorker'){ state.equipe.push({nome:'',funcao:'',cpf:'',mat:'',trein:{},aso:false,ass:null,em:null}); save(); renderTab(); const p=$('panel'); p.scrollTop=p.scrollHeight; return; }
  if(a==='rmWorker'){ state.equipe.splice(+b.dataset.i,1); save(); return renderTab(); }
  if(a==='addImp'){ state.impExtra.push({txt:''}); save(); renderTab(); const f=document.getElementById(fid(`impExtra.${state.impExtra.length-1}.txt`)); f&&f.focus(); return; }
  if(a==='rmImp'){ const i=+b.dataset.i, n=state.impExtra.length, im=state.lib.imped; state.impExtra.splice(i,1); for(let j=i;j<n;j++){ if(j+1<n && im['ix_'+(j+1)]) im['ix_'+j]=im['ix_'+(j+1)]; else delete im['ix_'+j]; } save(); return renderTab(); }
  if(a==='copiarEnd'){
    const e = state.meta.clienteEnd || {}, base = b.dataset.base;
    if(!['log','cidade','cep'].some(k => tx(e[k]))){ API.toast('O cadastro deste cliente ainda não tem endereço. Preencha em Administração → Clientes.','bad'); return; }
    set(base, mesclar(END0(), e)); setSt(base,'Endereço copiado do cadastro do cliente. Ajuste se precisar.'); renderTab(); API.toast('Endereço copiado do cadastro.'); return;
  }
  if(a==='addEtapa'){ if(state.etapas.length>=MAX_ETAPAS) return; state.etapas.push({ativ:'',passo:'',med:'',riscos:[]}); save(); renderTab();
    const f=document.getElementById(fid(`etapas.${state.etapas.length-1}.ativ`)); f&&f.focus(); return; }
  if(a==='rmEtapa'){ const i=+b.dataset.i, e=state.etapas[i], vazia=!tx(e.ativ)&&!tx(e.passo)&&!tx(e.med)&&!e.riscos.length;
    if(!vazia && armed!=='rmEtapa'+i){ armed='rmEtapa'+i; b.textContent='Confirmar remoção'; setTimeout(()=>{ if(armed==='rmEtapa'+i){ armed=null; b.textContent='Remover'; } },4000); return; }
    armed=null; state.etapas.splice(i,1); invalidarAssElab(); save(); return renderTab(); }
  if(a==='upEtapa'){ const i=+b.dataset.i; if(i>0){ const E=state.etapas; [E[i-1],E[i]]=[E[i],E[i-1]]; save(); renderTab(); } return; }
  if(a==='addRiscoEt'){ const i=+b.dataset.i, v=($(`addRk_${i}`)||{}).value; if(!v){ API.toast('Escolha um risco na lista.','bad'); return; }
    state.etapas[i].riscos.push({id:v,nome:'',p:null,s:null}); save(); renderTab();
    if(v==='outro'){ const f=document.getElementById(fid(`etapas.${i}.riscos.${state.etapas[i].riscos.length-1}.nome`)); f&&f.focus(); } return; }
  if(a==='rmRiscoEt'){ state.etapas[+b.dataset.i].riscos.splice(+b.dataset.j,1); save(); return renderTab(); }
  if(a==='sugMed'){ const e=state.etapas[+b.dataset.i]; e.med=(tx(e.med)?tx(e.med)+'\n':'')+b.dataset.m; save(); return renderTab(); }
  if(a==='ps'){ if(somenteLeitura()) return; set(b.dataset.k, +b.dataset.v); return renderTab(); }
  if(a==='matriz'){ const d=$('dlg'); d.querySelector('.dlg-t').textContent='Matriz de risco 4×4';
    d.querySelector('.dlg-b').innerHTML = matrizHTML(celulasMatriz()) + '<p class="hint" style="margin:10px 0 0">O número na bolinha é a quantidade de riscos das etapas naquela casa. Risco crítico (12–16) impede a liberação.</p>';
    d.hidden=false; return; }
  if(a==='sugQ'){ const sg=sugeridos(), k=b.dataset.q, base={m:'medidas',e:'epi',c:'epc'}[k]; sg[k].forEach(x=>state[base][x]=true); invalidarAssElab(); save(); return renderTab(); }
  if(a==='meusDados'){ if(b.dataset.b==='elaborador') invalidarAssElab(); usarMeusDados(b.dataset.b); return renderTab(); }
  if(a==='addRisco'){ state.riscosExtra.push({nome:'',p:null,s:null,medida:''}); save(); renderTab(); const f=document.getElementById(fid(`riscosExtra.${state.riscosExtra.length-1}.nome`)); f&&f.focus(); return; }
  if(a==='rmRisco'){ state.riscosExtra.splice(+b.dataset.i,1); save(); return renderTab(); }
  if(a==='addHosp'){ state.emerg.hospitais.push({nome:'',addr:END0(),tel:'',km:'',min:''}); save(); renderTab(); const p=$('panel'); p.scrollTop=p.scrollHeight; return; }
  if(a==='rmHosp'){ state.emerg.hospitais.splice(+b.dataset.i,1); save(); return renderTab(); }
  if(a==='addTel'){ state.emerg.tel.push({s:'',t:''}); save(); return renderTab(); }
  if(a==='rmTel'){ state.emerg.tel.splice(+b.dataset.i,1); save(); return renderTab(); }
  if(a==='sign'){ if(b.dataset.k==='lib.liberador.ass' && !state.lib.liberador.ass && !libPodeAssinar()) return API.toast(LOCK_LIB.replace('🔒 ',''),'bad'); return openSig(b.dataset.k,b.dataset.label); }
  if(a==='sigClear') return clearSig();
  if(a==='sigCancel') return closeSig();
  if(a==='sigSave') return saveSig();
  if(a==='liberar') return acaoServidor('liberar_documento', {}, 'PT liberada.');
  if(a==='suspender'){ if(!tx(state.lib.motivo)){ API.toast('Informe o motivo da suspensão.','bad'); $(fid('lib.motivo'))?.focus(); return; }
    return acaoServidor('suspender_documento', {p_motivo: tx(state.lib.motivo)}, 'PT suspensa.'); }
  if(a==='retomar'){ const m=tx($('motivoRet')?.value); if(!m){ API.toast('Informe o motivo da retomada e as condições conferidas.','bad'); $('motivoRet')?.focus(); return; }
    return acaoServidor('retomar_documento', {p_motivo: m}, 'Trabalho retomado.'); }
  if(a==='encerrar') return acaoServidor('encerrar_documento', {}, 'PT encerrada.', 'doc');
  if(a==='voltar') return voltar();
  if(a==='dlgFechar'){ $('dlg').hidden=true; return; }
  if(a==='pdf') return baixarPDF();
  if(a==='imprimir') return window.print();
  if(a==='duplicar') return duplicar();
  if(a==='cancelar'){
    if(armed!=='cancelar'){ armed='cancelar'; b.textContent='Confirmar cancelamento'; setTimeout(()=>{ if(armed==='cancelar'){ armed=null; b.textContent='Cancelar documento'; } },4000); return; }
    armed=null; const m=($('motivoCancel')||{}).value||''; if(!m.trim()){ API.toast('Informe o motivo do cancelamento.','bad'); return; }
    return acaoServidor('cancelar_documento', {p_motivo:m}, 'Documento cancelado.');
  }
});

/* ---------- Ações no servidor ---------- */
function aplicarDoc(doc){ const tab=cur; state = normalizar(doc); cur = tab; renderTab(); }
async function acaoServidor(fn, args, okMsg, irPara){
  await salvarAgora();
  if(ED.pendente){ API.toast('Não foi possível salvar as últimas alterações. Tente de novo.','bad'); return; }
  try {
    const doc = await API.call(fn, Object.assign({ p_id: ED.id }, args));
    aplicarDoc(doc); API.toast(okMsg);
    if(irPara) go(irPara);
  } catch(e){
    if(e.detalhes && e.detalhes.length) mostrarPendenciasServidor(e.message, e.detalhes);
    else API.toast(e.message, 'bad');
  }
}
function mostrarPendenciasServidor(titulo, itens){
  const d=$('dlg'); d.querySelector('.dlg-t').textContent=titulo;
  d.querySelector('.dlg-b').innerHTML = `<p class="hint" style="margin:0">O servidor conferiu o documento e encontrou:</p><ul>${itens.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`;
  d.hidden=false;
}
async function voltar(){ await salvarAgora(); if(ED.onVoltar) ED.onVoltar(); }
async function duplicar(){
  await salvarAgora();
  try { const r = await API.call('duplicar_documento', { p_id: ED.id }); API.toast(`Criado o documento ${r.numero}.`); location.hash = `#/doc/${r.id}`; }
  catch(e){ API.toast(e.message,'bad'); }
}
function urlVerificacao(){ const base=(window.APRFLOW_CONFIG.SITE_URL||location.origin).replace(/\/$/,''); return `${base}/verificar.html?c=${encodeURIComponent(state.meta.verif||'')}`; }
function desenharQR(){
  const box=$('qrbox'); if(!box || !window.QRCode || !state.meta.verif) return;
  box.innerHTML=''; new QRCode(box, { text: urlVerificacao(), width: 156, height: 156, correctLevel: QRCode.CorrectLevel.M });
}
async function baixarPDF(){
  await salvarAgora();
  API.toast('Gerando PDF…');
  try { const pdf = await APRPDF.gerarDeEstado(state); pdf.save(APRPDF.nomeArquivo(state)); }
  catch(e){ API.toast(e.message || 'Não foi possível gerar o PDF. Use Imprimir.','bad'); }
}

/* ---------- Assinatura ---------- */
let sigKey=null, drawn=false, ctx=null, drawing=false;
const cv = $('sigCanvas');
function openSig(k,label){
  sigKey=k; drawn=false; $('sigTitle').textContent=label||'Assinatura';
  $('sigModal').hidden=false;
  const r=cv.getBoundingClientRect(), d=window.devicePixelRatio||1;
  cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d);
  ctx=cv.getContext('2d'); ctx.setTransform(d,0,0,d,0,0); clearSig();
}
function clearSig(){ if(!ctx) return; const r=cv.getBoundingClientRect(); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,r.width,r.height); ctx.strokeStyle='#cfd6d4'; ctx.beginPath(); ctx.moveTo(20,r.height-40); ctx.lineTo(r.width-20,r.height-40); ctx.stroke(); drawn=false; }
function closeSig(){ $('sigModal').hidden=true; sigKey=null; }
function saveSig(){ if(!drawn) { $('sigSub').textContent='Faça a assinatura no quadro antes de confirmar.'; return; }
  set(sigKey, assinaturaReduzida()); set(sigKey.replace(/\.ass$/,'.em'), new Date().toISOString());
  $('sigSub').textContent='Assine com o dedo ou o mouse no quadro abaixo.'; closeSig(); renderTab(); }
/* Guarda só o traço (sem espaço em branco nem linha-guia), com no máximo 600 x 200 px */
function assinaturaReduzida(){
  const r = Assin.recortar(cv), c = document.createElement('canvas'), x = c.getContext('2d');
  if(!r){ c.width = 360; c.height = 120; x.fillStyle = '#fff'; x.fillRect(0,0,360,120); x.drawImage(cv,0,0,360,120); return c.toDataURL('image/png'); }
  const k = Math.min(1, 600 / r.w, 200 / r.h);
  c.width = Math.max(1, Math.round(r.w * k)); c.height = Math.max(1, Math.round(r.h * k));
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(r.canvas, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}
const pt = e => { const r=cv.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top]; };
cv.addEventListener('pointerdown', e=>{ drawing=true; cv.setPointerCapture(e.pointerId); const [x,y]=pt(e); ctx.strokeStyle='#111'; ctx.lineWidth=2.3; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(x,y); });
cv.addEventListener('pointermove', e=>{ if(!drawing) return; const [x,y]=pt(e); ctx.lineTo(x,y); ctx.stroke(); drawn=true; });
['pointerup','pointercancel','pointerleave'].forEach(t=>cv.addEventListener(t,()=>{ drawing=false; }));
document.addEventListener('keydown', e=>{ if(e.key!=='Escape') return; if(!$('sigModal').hidden) closeSig(); else if(!$('dlg').hidden) $('dlg').hidden=true; });
/* clique fora da janela também fecha */
$('dlg').addEventListener('click', e=>{ if(e.target.id==='dlg') $('dlg').hidden=true; });

/* ---------- Abrir documento ---------- */
window.Editor = {
  async abrir(id, usuario, aba){
    ED.id = id; ED.usuario = usuario; ED.pendente = false; ED.auto = {};
    const doc = await API.call('obter_documento', { p_id: id });
    state = normalizar(doc);
    cur = TABS.some(t=>t[0]===aba) ? aba : (['liberada','suspensa'].includes(doc.status) ? 'lib' : ['encerrada','cancelada'].includes(doc.status) ? 'doc' : 'ident');
    saveStatus(somenteLeitura() ? 'Somente leitura' : 'Salvo');
    $('panel').scrollTop = 0; renderTab();
    return doc;
  },
  salvarAgora,
  normalizar,
  temPendente: () => ED.pendente,
  set onVoltar(fn){ ED.onVoltar = fn; },
  fechar(){ state = null; ED.id = null; }
};
