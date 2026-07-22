import type { IdeaBatchInput } from "./pipelineValidators";

/** Dutch fixture IdeaBatch — fictional clubs, `fixture:` Neon ids. */
export function buildFixtureIdeaBatch(divisionKey: string): IdeaBatchInput {
  return {
    ideas: [
      {
        ideaTitle: "Onverwachte koploper houdt stand na zware start",
        titleProposals: [
          "Van hekkensluiter tot koploper: hoe FC Voorbeeld kantelde",
          "Zes op rij: de cijfers achter de opmars van FC Voorbeeld",
          "Trainer De Smet over de ommekeer: “We speelden eindelijk vrij”",
        ],
        whyInteresting: `FC Voorbeeld stond na vijf speeldagen nog laatste in ${divisionKey}, maar leidt nu de reeks. Dat contrast leent zich voor een data-gedreven portret van de ommekeer.`,
        supportingFacts: [
          {
            claim: "FC Voorbeeld behaalde zes zeges op rij na speeldag 5.",
            evidence:
              "Voorbeelddata: speeldagen 6–11 allemaal gewonnen; +14 doelsaldo in die reeks.",
            source: "convex",
            sqlFingerprint: "fixture:win-streak-example",
          },
          {
            claim:
              "De ploeg scoorde in die reeks gemiddeld meer dan twee goals per wedstrijd.",
            evidence: "Voorbeelddata: 13 goals in 6 wedstrijden (2,17 per match).",
            source: "convex",
          },
        ],
        interviewees: [
          {
            neonPersonId: "fixture:person:1001",
            fullName: "Jan De Smet",
            contactType: "staff",
            contactTypeDetail: "T1-trainer",
            neonClubId: "fixture:club:10",
            clubName: "FC Voorbeeld",
            neonTeamId: "fixture:team:10-a",
            teamName: "Eerste elftal",
            whyInterview:
              "Als trainer kan hij de tactische en mentale omslag duiden achter de cijfermatige opmars.",
            interviewerNotes:
              "Jan De Smet is T1-trainer van FC Voorbeeld. Interview hem over de ommekeer na speeldag 5: wat veranderde tactisch en mentaal, en hoe houdt hij de ploeg scherp als koploper. Doel: een data-gedreven portret van de opmars met zijn duiding.",
            questions: [
              "Wat veranderde er in de weekelijkse voorbereiding na speeldag 5?",
              "Welke tactische knop draaide u om toen de zegereeks begon?",
              "Hoe houdt u de groep scherp nu jullie bovenaan staan?",
            ],
          },
        ],
        researchSummary:
          "Fixture-idee ter illustratie van IdeaBatch-vorm; niet gebaseerd op Neon.",
      },
      {
        ideaTitle: "Spitsenrace: wie maakt de meeste treffers vanuit open spel?",
        titleProposals: [
          "Niet alleen penalties: de echte spitsenrace in deze reeks",
          "Open-spel treffers blootgelegd: drie namen springen eruit",
          "De stille topschutter die niemand noemt",
        ],
        whyInteresting:
          "Een klassieke topschutterstabel verdoezelt penaltygoals. Open-spelcijfers geven een scherper beeld van afronders.",
        supportingFacts: [
          {
            claim: "Drie spelers scoorden minstens acht keer vanuit open spel.",
            evidence: "Voorbeelddata: spitsen A/B/C met 11, 9 en 8 open-spel goals.",
            source: "convex",
          },
        ],
        interviewees: [
          {
            neonPersonId: "fixture:person:2002",
            fullName: "Lars Peeters",
            contactType: "player",
            contactTypeDetail: "spits",
            neonClubId: "fixture:club:22",
            clubName: "SK Nebula",
            whyInterview:
              "Hij leidt de open-spel ranking en kan vertellen hoe de ploeg kansen creëert.",
            interviewerNotes:
              "Lars Peeters is spits bij SK Nebula en topscorer vanuit open spel. Vraag naar kanscreatie, zijn rol in de afronding en hoe bewust hij penaltygoals mijdt. Doel: de spitsenrace scherp maken met zijn perspectief.",
            questions: [
              "Welke type kansen leveren jullie de meeste open-spel goals op?",
              "Hoe bewust vermijd je de penalty als primaire scoringsroute?",
              "Wie is jouw belangrijkste aangever dit seizoen?",
            ],
          },
          {
            neonPersonId: "fixture:person:2003",
            fullName: "An Vandenberghe",
            contactType: "staff",
            contactTypeDetail: "assistent-trainer",
            neonClubId: "fixture:club:22",
            clubName: "SK Nebula",
            whyInterview:
              "Geeft context over pressing en voorzetpatronen achter de scoringscijfers.",
            interviewerNotes:
              "An Vandenberghe is assistent-trainer bij SK Nebula. Gebruik haar voor tactische context: pressing-triggers en voorzetpatronen die de open-spel goals voeden. Doel: de cijfers vertalen naar speelwijze.",
            questions: [
              "Welke pressing-triggers leiden tot die open-spel kansen?",
              "Hoe oefenen jullie afronden vanuit de tweede lijn?",
            ],
          },
        ],
      },
      {
        ideaTitle: "Thuisbolwerk versus uitarmoede",
        titleProposals: [
          "Thuis onverslaanbaar, uit kansloos: het dubbelleven van Union Nord",
          "Waarom Union Nord thuis wint en onderweg niets meeneemt",
          "Punten split: het grootste thuis/uit-gap in de reeks",
        ],
        whyInteresting:
          "Een extreme split tussen thuis- en uitvorm is redactioneel spannend en meetbaar.",
        supportingFacts: [
          {
            claim:
              "Union Nord pakte 90% van de thuispunten maar minder dan 15% uit.",
            evidence: "Voorbeelddata: 18/20 thuispunten, 3/21 uitpunten.",
            source: "convex",
          },
        ],
        interviewees: [],
      },
      {
        ideaTitle: "Jeugd die doorbreekt op het juiste moment",
        titleProposals: [
          "Achttien en onmisbaar: de doorbraak van Yari Maes",
          "Van beloften naar basis: minuten en impact van Yari Maes",
          "De tiener die de middenlinie kantelde",
        ],
        whyInteresting:
          "Jeugdige doorbraken raken lezers lokaal; speelminuten en impact zijn objectiveerbaar.",
        supportingFacts: [
          {
            claim:
              "Yari Maes speelde de laatste acht speeldagen meer dan 80% van de minuten.",
            evidence: "Voorbeelddata: 630/720 minuten sinds speeldag 8.",
            source: "convex",
          },
        ],
        interviewees: [
          {
            neonPersonId: "fixture:person:3001",
            fullName: "Yari Maes",
            contactType: "player",
            contactTypeDetail: "middenvelder",
            neonClubId: "fixture:club:31",
            clubName: "Racing Hemelrijk",
            neonTeamId: "fixture:team:31-a",
            teamName: "Eerste elftal",
            whyInterview:
              "Eerste aanspreekpunt voor het verhaal over zijn doorbraak en rol in het elftal.",
            interviewerNotes:
              "Yari Maes (18) is middenvelder bij Racing Hemelrijk en speelt bijna alle minuten. Interview over zijn doorbraak van beloften naar basis en zijn opdracht in balverlies. Doel: een herkenbaar jeugdverhaal met concrete speelimpact.",
            questions: [
              "Wanneer wist je dat je een vaste basisplaats zou krijgen?",
              "Wat is het grootste verschil tussen beloften en eerste elftal?",
              "Welke opdracht krijg je van de coach in balverlies?",
            ],
          },
        ],
      },
      {
        ideaTitle: "Degradatiestrijd op doelsaldo en late goals",
        titleProposals: [
          "Late tegengoals houden drie clubs in de dropzone",
          "Doelsaldo als scheidsrechter in de degradatiestrijd",
          "Vijf goals na minuut 80: zo duur werd de slotfase",
        ],
        whyInteresting:
          "Een krappe degradatiestrijd met late goals is spannend en volledig te staven met wedstrijdevents.",
        supportingFacts: [
          {
            claim:
              "Drie clubs binnen drie punten van de dropzone kregen samen vijf tegengoals na minuut 80.",
            evidence: "Voorbeelddata: events na 80' in speeldagen 10–14.",
            source: "convex",
          },
        ],
        interviewees: [
          {
            neonPersonId: "fixture:person:4001",
            fullName: "Koen Willems",
            contactType: "board",
            contactTypeDetail: "voorzitter",
            neonClubId: "fixture:club:40",
            clubName: "VV Laagveld",
            whyInterview:
              "Kan de druk op de club en de keuze voor stabiliteit of risico duiden in de slotfase van de heenronde.",
            interviewerNotes:
              "Koen Willems is voorzitter van VV Laagveld, midden in de degradatiestrijd. Peil de druk na late tegengoals en of de club rust of versterking zoekt. Doel: bestuurlijke duiding bij de cijfers rond doelsaldo en slotfases.",
            questions: [
              "Hoe voelt de druk in de kleedkamer na die late tegengoals?",
              "Kiest de club voor rust of voor versterking in de winter?",
              "Wat zegt het doelsaldo over jullie speelwijze onder druk?",
            ],
          },
        ],
      },
    ],
  };
}
