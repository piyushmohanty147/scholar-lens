export type GuideSection = { h: string; p?: string[]; list?: string[] };
export type Guide = { slug: string; title: string; description: string; sections: GuideSection[] };

export const GUIDES_UPDATED = "15 October 2026";

export const GUIDES: Guide[] = [
  {
    slug: "how-to-do-a-literature-review",
    title: "How to do a literature review, step by step",
    description: "A practical, step-by-step method for doing a literature review for a thesis, project or paper without drowning in papers.",
    sections: [
      {
        h: "What a literature review is",
        p: [
          "A literature review is a structured summary of what published research already says about a topic. It shows what is known, where studies disagree, and what is still missing. A good one is organised by ideas, not by listing papers one after another.",
        ],
      },
      {
        h: "Step 1: Turn your topic into one clear question",
        p: [
          "A vague topic such as social media and teenagers will return thousands of papers. A question such as how does evening social media use affect sleep in teenagers tells you what to search for and what to ignore. Write your question in one sentence before you search.",
        ],
      },
      {
        h: "Step 2: Search in more than one place",
        list: [
          "Use a general scholarly search such as Google Scholar, plus an open index such as OpenAlex or Semantic Scholar.",
          "Add a subject database if your field has one, for example PubMed for medicine or RePEc for economics.",
          "Try 3 to 5 different phrasings, because authors use different words for the same idea.",
          "Look for review articles and meta-analyses first, since they summarise many studies and list useful references.",
        ],
      },
      {
        h: "Step 3: Screen quickly, then read properly",
        p: [
          "Read titles and abstracts first and sort papers into yes, maybe and no. Keep only the yes pile for careful reading. Check the date, the sample or data used, the method, and whether other researchers have cited the paper.",
        ],
      },
      {
        h: "Step 4: Take notes in a table",
        list: [
          "One row per paper: citation, question, method, sample, main finding, limitation.",
          "Add a column for how the paper relates to your question.",
          "Save every citation as you go, so you do not have to hunt for details later.",
        ],
      },
      {
        h: "Step 5: Group papers by theme and look for gaps",
        p: [
          "Sort your notes into themes, such as different approaches, different populations or competing explanations. Then ask what is missing: a group nobody studied, a method nobody tried, or a result that studies disagree about. That gap is often the reason your own project matters.",
        ],
      },
      {
        h: "Step 6: Write it as an argument",
        p: [
          "Each paragraph should make a point and use several papers to support it, compare them, and say what remains unclear. End by explaining how your own work fits into the picture.",
        ],
      },
      {
        h: "Speeding up the search",
        p: [
          "Scholar Lens can rank papers against your actual question and give a plain-language deep dive of each one, with citations and related work. Always check the original paper before relying on a detail, because summaries are written from abstracts.",
        ],
      },
    ],
  },
  {
    slug: "how-to-tell-if-a-research-topic-is-growing",
    title: "How to tell whether a research topic is growing",
    description: "Learn how to use publication counts, citations and subtopics to judge whether a research field is rising, flat or falling, and the common mistakes to avoid.",
    sections: [
      {
        h: "Why this matters",
        p: [
          "Before you commit months to a thesis, a project or a product idea, it helps to know whether a field is gaining attention or fading. Published research is one of the clearest early signals, because papers appear long before products and policies do.",
        ],
      },
      {
        h: "Count papers per year",
        p: [
          "Search your topic in an open index such as OpenAlex or Google Scholar and note how many papers appear for each of the last 5 to 10 years. A rising line suggests more researchers are paying attention. Use a consistent search phrase for every year.",
        ],
      },
      {
        h: "Compare against all research",
        p: [
          "The total number of papers published grows every year, so a raw count can rise even when a topic is losing ground. A fairer check is the topic's share of all papers. If your topic grew 20 percent while all research grew 30 percent, it actually shrank in relative terms.",
        ],
      },
      {
        h: "Look at citations",
        list: [
          "Highly cited older papers show the foundations of the field.",
          "Recent papers that are already cited a lot point to ideas gaining traction.",
          "If new papers are rarely cited, interest may be thin.",
        ],
      },
      {
        h: "Break the topic into subtopics",
        p: [
          "A field can be flat overall while one corner grows quickly. Check which subtopics are taking a larger share of recent papers, and which are falling behind. That is often where the real opportunities and risks are.",
        ],
      },
      {
        h: "Check who is funding and publishing it",
        p: [
          "Look at which countries, institutions, journals and funders are active. Growing involvement from many different groups is a stronger sign than one lab publishing a lot.",
        ],
      },
      {
        h: "Common mistakes",
        list: [
          "Treating research attention as market success. Papers show interest, not demand or profit.",
          "Using a search phrase that is too broad or changes between years.",
          "Ignoring the difference between a hype spike and steady growth.",
          "Relying on one source. Compare at least two.",
        ],
      },
      {
        h: "Doing this faster",
        p: [
          "Scholar Lens Project Outlook compares a topic's share of all research over time, lists subtopics gaining or losing ground, and shows who is publishing, then turns this into opportunities, risks and scenarios. It is an informed outlook based on published research, not a guarantee or financial advice.",
        ],
      },
    ],
  },
  {
    slug: "how-to-read-a-research-paper-quickly",
    title: "How to read a research paper quickly",
    description: "A fast, three-pass method for reading research papers so you can decide what to read closely and what to skip.",
    sections: [
      {
        h: "Do not read it start to finish",
        p: [
          "Papers are written for reference, not for reading like a story. Reading in passes saves hours. This approach follows the well-known three-pass idea described by S. Keshav in his short guide called How to Read a Paper.",
        ],
      },
      {
        h: "Pass 1: The 5-minute scan",
        list: [
          "Read the title and the abstract.",
          "Skim the headings, the figures and the conclusion.",
          "Decide: is this relevant to my question? If not, stop here.",
        ],
      },
      {
        h: "Pass 2: The main argument",
        list: [
          "Read the introduction and look carefully at the figures and tables.",
          "Note the research question, the method, the data or sample, and the main result.",
          "Mark references you want to follow up.",
        ],
      },
      {
        h: "Pass 3: Check the details (only for key papers)",
        p: [
          "For the few papers that matter most, read the methods closely. Ask whether the sample is large enough, whether the comparison is fair, and whether the conclusions go beyond what the data shows.",
        ],
      },
      {
        h: "Questions to ask every paper",
        list: [
          "What exactly did they test, and on whom or what?",
          "How big is the effect, not just whether it was found?",
          "What did the authors say they could not show?",
          "Do other studies agree?",
          "Who funded it, and could that matter?",
        ],
      },
      {
        h: "Keep notes you can reuse",
        p: [
          "After each paper, write three lines: the claim, the evidence, and the limitation. Save the citation at the same time. This one habit makes writing a literature review far easier.",
        ],
      },
      {
        h: "A faster first pass",
        p: [
          "Scholar Lens gives a plain-language deep dive of a paper: study design, key findings, strengths, limitations, who cites it and related papers, plus a link to the free full text when one exists. It uses the abstract and public data, so always read the original before relying on a detail.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
