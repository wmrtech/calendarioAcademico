# Brainstorming de Design - Academic Calendar

<response>
<probability>0.08</probability>
<text>
## Idea 1: "Neo-Brutalist Scholar"

*   **Design Movement**: Neo-Brutalism (Suave)
*   **Core Principles**:
    1.  **Honestidade Estrutural**: Bordas visíveis, containers definidos, sem esconder a grade do calendário.
    2.  **Contraste Alto**: Uso de preto e branco predominante com cores de destaque vibrantes e saturadas para categorias.
    3.  **Tipografia Expressiva**: Fontes monoespaçadas para dados e fontes display grandes e ousadas para títulos.
    4.  **Funcionalidade Crua**: Botões com sombras duras (hard shadows) e estados de hover agressivos.

*   **Color Philosophy**: Uma base de "Papel Jornal" (off-white) e "Tinta Preta" para leitura máxima, evocando documentos acadêmicos impressos. As cores das categorias (Ciências, Artes, Humanas) são cores primárias puras (Azul, Vermelho, Amarelo) para criar um sistema de codificação visual instantâneo e sem ambiguidade.

*   **Layout Paradigm**: Assimétrico e baseado em blocos. O calendário não flutua; ele é ancorado por linhas grossas. A barra lateral de filtros é um bloco sólido, separado do conteúdo principal por uma borda de 2px ou 3px.

*   **Signature Elements**:
    1.  **Hard Shadows**: Sombras sólidas pretas deslocadas em 4px, sem blur.
    2.  **Bordas Espessas**: Todos os elementos interativos têm bordas de 2px a 3px.
    3.  **Ícones Outline**: Ícones Heroicons no estilo outline com traço espesso.

*   **Interaction Philosophy**: "Tátil e Mecânico". Clicar em um botão deve parecer pressionar um interruptor físico. Transições são rápidas (150ms) e lineares, sem curvas de aceleração suaves.

*   **Animation**: Animações de "slide" simples. Modais deslizam de baixo para cima com um "baque" seco (efeito bounce rápido).

*   **Typography System**:
    *   Títulos: **Space Grotesk** ou **Archivo Black** (Bold/Black).
    *   Corpo/Dados: **JetBrains Mono** ou **Roboto Mono**.
</text>
</response>

<response>
<probability>0.05</probability>
<text>
## Idea 2: "Glassmorphism Campus"

*   **Design Movement**: Glassmorphism (Moderno/Futurista)
*   **Core Principles**:
    1.  **Profundidade e Camadas**: Uso extensivo de blur de fundo (backdrop-filter) para criar hierarquia.
    2.  **Leveza**: O calendário parece flutuar sobre um fundo abstrato e fluido.
    3.  **Luz e Cor**: Gradientes suaves e translúcidos que mudam conforme o contexto ou hora do dia.
    4.  **Bordas Sutis**: Bordas brancas semitransparentes para definir formas sem peso visual.

*   **Color Philosophy**: "Aurora Boreal Acadêmica". Fundo escuro ou colorido com formas orgânicas em tons de violeta, azul-petróleo e magenta. O conteúdo vive em "cartões de vidro" fosco. Evoca tecnologia, inovação e o futuro da educação.

*   **Layout Paradigm**: Fluido e centralizado. O calendário é o "herói" no centro, com painéis de controle flutuando ao redor ou em gavetas (drawers) translúcidas.

*   **Signature Elements**:
    1.  **Frosted Glass**: Painéis com fundo branco/preto com baixa opacidade e alto blur.
    2.  **Glows**: Brilhos suaves atrás de elementos ativos ou datas importantes.
    3.  **Gradientes de Texto**: Títulos principais com gradientes sutis.

*   **Interaction Philosophy**: "Etéreo e Fluido". Interações parecem acontecer na água. Hover levanta levemente os elementos e aumenta o brilho.

*   **Animation**: Transições lentas e suaves (ease-in-out). Modais aparecem com fade e scale suave. O fundo pode ter uma animação de pulso muito lenta.

*   **Typography System**:
    *   Títulos: **Inter** ou **Plus Jakarta Sans** (com tracking apertado).
    *   Corpo: **Inter** (altamente legível em fundos complexos).
</text>
</response>

<response>
<probability>0.07</probability>
<text>
## Idea 3: "Swiss Style Academy"

*   **Design Movement**: Estilo Tipográfico Internacional (Swiss Style)
*   **Core Principles**:
    1.  **Grid Rigoroso**: Tudo está alinhado matematicamente. O espaço negativo é estrutural.
    2.  **Objetividade**: Design limpo, sem ornamentos desnecessários. A forma segue a função.
    3.  **Tipografia como Imagem**: O tamanho e peso da fonte criam a hierarquia visual principal, não cores ou caixas.
    4.  **Assimetria Equilibrada**: Layouts dinâmicos mas perfeitamente balanceados.

*   **Color Philosophy**: "Monocromático com Acentos". Base branca absoluta (#FFFFFF) e texto preto (#000000). Uma única cor de destaque forte (ex: Laranja Internacional ou Azul Klein) usada *apenas* para ações principais ou o dia atual. Categorias são diferenciadas por formas geométricas pequenas ou etiquetas de texto coloridas, não por fundos inteiros.

*   **Layout Paradigm**: Modular e baseado em colunas. O calendário é uma grade perfeita. A navegação e filtros ocupam uma coluna lateral larga com muito espaço em branco.

*   **Signature Elements**:
    1.  **Linhas Divisórias Finas**: Linhas de 1px em cinza claro para separar dias e semanas.
    2.  **Tipografia Gigante**: O mês e ano são enormes, ocupando uma área significativa.
    3.  **Formas Geométricas**: Círculos ou quadrados sólidos para indicar status.

*   **Interaction Philosophy**: "Preciso e Instantâneo". Feedback visual claro e direto. Sem sombras, apenas mudanças de cor ou inversão de cor (preto vira branco, branco vira preto).

*   **Animation**: Mínima ou inexistente. Cortes secos ou slides muito rápidos e precisos.

*   **Typography System**:
    *   Títulos e Corpo: **Helvetica Now** ou **Inter** (apenas pesos Regular e Bold, nada no meio).
</text>
</response>
