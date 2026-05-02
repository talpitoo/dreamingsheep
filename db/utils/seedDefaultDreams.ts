import db from "db"
import { DateTime } from "luxon"

/**
 * Seeds demo user's dreams with associated symbols
 */
export default async function seedDefaultDreams() {
  const demoUser = await db.user.findFirst({
    where: {
      role: "DEMO",
    },
  })

  if (!demoUser) return Promise.reject("No demo user configured, please seed users first")

  const symbolsTheButterflyDream = await db.symbol.findMany({
    where: {
      OR: [
        { code: "transcendental" },
        { code: "false-memory" },
        { code: "inception" },
        { code: "flying" },
        { code: "insects" },
        { code: "philosophy" },
        { code: "dao" },
      ],
    },
  })

  // NOTE: at the end it was decided to seed as `dreamAt: DateTime.now().minus({ day: 7 }).toUTC().toISO()` instead of `dreamAt: lastWeek`
  const dateTime = DateTime.now() // NOTE: possible UTC/local timezone conflict, double-check
  const past = dateTime.minus({ day: 9 }).toUTC().toISO()
  const lastWeek = dateTime.minus({ day: 7 }).toUTC().toISO()
  const twoDaysBeforeYesterday = dateTime.minus({ day: 3 }).toUTC().toISO()
  const dayBeforeYesterday = dateTime.minus({ day: 2 }).toUTC().toISO()
  const yesterday = dateTime.minus({ day: 1 }).toUTC().toISO()
  const today = dateTime.toUTC().toISO()

  await db.dream.create({
    data: {
      title: "The Butterfly Dream",
      description:
        "Once, Zhuang Zhou dreamed he was a butterfly, a butterfly flitting and fluttering about, happy with himself and doing as he pleased. He didn't know that he was Zhuang Zhou. Suddenly he woke up and there he was, solid and unmistakable Zhuang Zhou. But he didn't know if he was Zhuang Zhou who had dreamt he was a butterfly, or a butterfly dreaming that he was Zhuang Zhou. Between Zhuang Zhou and the butterfly there must be some distinction! This is called the Transformation of Things.",
      notes: "",
      favorite: true,
      type: "LUCID",
      recall: "N_A",
      mood: 4,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsTheButterflyDream.map((symbol) => ({ id: symbol.id })),
      },
      dreamAt: DateTime.now().minus({ day: 9 }).toUTC().toISO(), // dreamAt: past,
    },
  })

  const symbolsTheDeathOfWonton = await db.symbol.findMany({
    where: { OR: [{ code: "under-water" }, { code: "death" }, { code: "mythical" }] },
  })

  await db.dream.create({
    data: {
      title: "The Death of Wonton",
      description:
        "The emperor of the Southern Seas was Lickety, the emperor of the Northern Sea was Split, and the emperor of the Center was Wonton. Lickety and Split often met each other in the land of Wonton, and Wonton treated them very well. Wanting to repay Wonton's kindness, Lickety and Split said, “All people have seven holes for seeing, hearing, eating, and breathing. Wonton alone lacks them. Let's try boring some holes for him.” So every day they bored one hole [in him], and on the seventh day Wonton died.",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 2,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsTheDeathOfWonton.map((symbol) => ({ id: symbol.id })),
      },
      dreamAt: DateTime.now().minus({ day: 7 }).toUTC().toISO(), // dreamAt: lastWeek,
    },
  })

  const symbolsDrummingOnATubAndSinging = await db.symbol.findMany({
    where: {
      OR: [
        { code: "love" },
        { code: "deceased" },
        { code: "music" },
        { code: "spirit" },
        { code: "mysterious" },
        { code: "transcendental" },
        { code: "significant-other" },
        { code: "friend-colleague" },
        { code: "dao" },
      ],
    },
  })

  await db.dream.create({
    data: {
      title: "Drumming On a Tub and Singing",
      description:
        "Zhuangzi's wife died. When Huizi went to convey his condolences, he found Zhuangzi sitting with his legs sprawled out, pounding on a tub and singing. “You lived with her, she brought up your children and grew old,” said Huizi. “It should be enough simply not to weep at her death. But pounding on a tub and singing—this is going too far, isn't it?” Zhuangzi said, “You're wrong. When she first died, do you think I didn't grieve like anyone else? But I looked back to her beginning and the time before she was born. Not only the time before she was born, but the time before she had a body. Not only the time before she had a body, but the time before she had a spirit. In the midst of the jumble of wonder and mystery a change took place and she had a spirit. Another change and she had a body. Another change and she was born. Now there's been another change and she's dead. It's just like the progression of the four seasons, spring, summer, fall, winter.” “Now she's going to lie down peacefully in a vast room. If I were to follow after her bawling and sobbing, it would show that I don't understand anything about fate. So I stopped.”",
      notes: "",
      type: "REGULAR",
      recall: "CLEAR",
      mood: 5,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsDrummingOnATubAndSinging.map((symbol) => ({ id: symbol.id })),
      },
      dreamAt: DateTime.now().minus({ day: 3 }).toUTC().toISO(), // dreamAt: twoDaysBeforeYesterday,
    },
  })

  const symbolsTheDebateOnTheJoyOfFish = await db.symbol.findMany({
    where: {
      OR: [
        { code: "under-water" },
        { code: "nature-outdoors" },
        { code: "animals-creatures" },
        { code: "conflict" },
        { code: "trickster" },
        { code: "friend-colleague" },
        { code: "philosophy" },
        { code: "dao" },
        { code: "debate" },
      ],
    },
  })

  await db.dream.create({
    data: {
      title: "The Debate on the Joy of Fish",
      description:
        "Zhuangzi and Huizi were enjoying themselves on the bridge over the Hao River. Zhuangzi said, “The minnows are darting about free and easy! This is how fish are happy.” Huizi replied, “You are not a fish. How do you know that the fish are happy?” Zhuangzi said, “You are not I. How do you know that I do not know that the fish are happy?” Huizi said, “I am not you, to be sure, so of course I don't know about you. But you obviously are not a fish; so the case is complete that you do not know that the fish are happy.” Zhuangzi said, “Let's go back to the beginning of this. You said, How do you know that the fish are happy; but in asking me this, you already knew that I know it. I know it right here above the Hao.”",
      notes: "",
      favorite: false,
      type: "LUCID",
      recall: "CLEAR",
      mood: 5,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsTheDebateOnTheJoyOfFish.map((symbol) => ({ id: symbol.id })),
      },
      dreamAt: DateTime.now().minus({ day: 2 }).toUTC().toISO(), // dreamAt: dayBeforeYesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "Zhuangzi's death",
      description:
        "When Master Zhuang was about to die, his disciples wanted to give him a lavish funeral. Master Zhuang said: “I take heaven and earth as my inner and outer coffins, the sun and moon as my pair of jade disks, the stars and constellations as my pearls and beads, the ten thousand things as my funerary gifts. With my burial complete, how is there anything left unprepared? What shall be added to it?” The disciples said: “We are afraid that the crows and kites will eat you, Master!” Master Zhuang said: “Above ground I'd be eaten by crows and kites, below ground I'd be eaten by mole crickets and ants. You rob the one and give to the other—how skewed would that be?”",
      notes: "",
      favorite: false,
      type: "LUCID",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 1 }).toUTC().toISO(), // dreamAt: yesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "Yao and Xu You",
      description:
        "Yao ceded the empire to Xu You. “A small torch burning on after the sun is out finds making the day brighter a difficult task indeed. A man who keeps on irrigating fields after the seasonal rains have come finds making the crops richer tedious indeed. If you, sir, once took the throne, thereupon would the world be in order. Yet I like an imposter continue in charge, despite seeing my own inadequacy. I beg to turn the world over to you.” Xu You said, “You rule the world and the world is already well ruled. Would I want to replace you for reputation’s sake? Reputation is merely the guest of reality - would I want to play the guest? When a wren builds its nest, although the woods may be deep it uses no more than one branch. When a mole goes to drink though it goes to a river it fills its belly and drinks no more. Go home and let the matter drop, my lord! I have no use for the world. Though the cook may not manage his job well, the sacrificial priest doesn’t leap over the altar wine and meats to take his place.”",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 1 }).toUTC().toISO(), // dreamAt: yesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "The hat salesman of Song",
      description:
        "There was a man from Song who sold ceremonial hats of the ancient style for a living, and he traveled to market his goods among the Yue peoples of the south. But the Yue peoples wear their hair cut short and tattoo their bodies - they had no use for his hats. The Emperor Yao set the people of the world in order and unified governance throughout the lands within the seas. Then he traveled to visit the Four Masters who lived on distant Guyi Mountain north beyond the River Fen, and in bewilderment he lost track of the world he possessed.",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 1 }).toUTC().toISO(), // dreamAt: yesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "Huizi’s ailanthus tree",
      description:
        "Huizi said to Zhuangzi, “I have a huge tree of the type people call an ailanthus. The main trunk is gnarled and knotted from the root up, you can’t align it with a plumb line, and the branches are all so twisted and bent that no compass or square can mark them. Even if it were growing by the roadside no passing carpenter would think of using it. Now, your words are just as big and useless, so everyone spurns them too!” Zhuangzi said, “Have you ever observed the wildcat? It crouches concealed and waits for its prey to wander in range - then it springs left or right, heedless of heights and chasms. And yet wildcats spring our traps and die in our nets. Or take the yak, big as a cloud hung from the sky - it’s skilled at being huge, but it can’t even catch a rat. Now you have this big tree but its uselessness is a trouble to you. Why don’t you plant it in the village of Nothing-at-All or the plain of Broad-Void and amble beside it doing nothing at all, or wander free and easy lying asleep beneath it? No ax will ever cut short its life, nothing will ever harm it. If there’s no use for it, what hardship could ever befall it?”",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 1 }).toUTC().toISO(), // dreamAt: yesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "The withering of the heart",
      description:
        "Great understanding is broad, small understanding is picky. Great words overflowing, small words haggling. Asleep the bodily soul goes roaming, awake it opens through our form. Our day by day encounters become the wrangling of our hearts - overgrown, encaverned, dense. Small fear all startled, great fear spreading out. “Shooting forth as from the trigger of a crossbow” - such are judgments, “that’s so, that’s not.” “Kept like an oath or a treaty” - such is the way we hold fast to prevailing. “Its death is as by autumn or winter” - describing its daily deterioration; what drowns it cannot revive it. “It is engulfed as though sealed up” - describing its desiccation in age; the heart near death cannot be returned to yang. Pleasure, anger, sorrow, joy, forethought, regret, change, stubbornness, ease and dissipation: these are like music emerging from air or mists congealing into mushrooms. Day and night they revolve before us and none knows whence they spring. Enough! Enough! It is the very coming of them, dawn and dusk, from which they are born.",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 2 }).toUTC().toISO(), // dreamAt: dayBeforeYesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "The true self and its fate",
      description:
        "“Without ‘other’ there is no ‘me’; without ‘me’ there is no reference point” - this certainly comes close to it, but we don’t yet know what brings ‘me’ about. It appears that there is something truly in control, but we just can’t find a trace of it. It can act itself out, true enough, but we cannot see its form - it possesses a true nature but lacks form. The hundred joints; the nine orifices, the six organs, all these are complete within - which do we take as closest kin? Are you pleased with them all, or partial to one? Do they all take parts as servants and consorts? But they would be unable to rule one another in this way. Do they take turns acting as ruler and subject or is there one who abides as a true ruler? Though we may fail to seek out its true nature, that has no bearing on whether it truly is there or not. Once we have received its completed form we can never lose awareness of it all the time we await its extinction. It grinds itself down against things and races towards its end at a gallop, none can stop it - how sad! To the end of its days it labors without ever seeing any accomplishment; all hemmed in, it labors to exhaustion without ever knowing where it shall return to in the end - is this not sorrowful! Men call this immortality: what’s the use of it? As the form changes so the heart changes with it: can this not be called great sorrow? Is man’s life inherently befuddled in this way, or is it I alone who am befuddled while there are others who are not?",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 2 }).toUTC().toISO(), // dreamAt: dayBeforeYesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "The fully formed mind and judgment",
      description:
        "As for following one’s fully formed mind and taking it as a teacher - who is without such a teacher? But why must one first understand alternatives? The mind can spontaneously select, and even the ignorant have such a mind. That there should be judgments of “that’s so; that’s not” before alternatives are fully formed in the mind is akin to the old saying about “going to Yue today and arriving yesterday” - this is taking what is not for what is. To take what is not for what is: though one be the spirit-like Yu one could not understand this, and whatever could I make of it?",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 2 }).toUTC().toISO(), // dreamAt: dayBeforeYesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "On the relativity of assertion and denial",
      description:
        "There is nothing that is not a “that”; there is nothing that is not a “this.” One cannot see oneself as a “that,” but if one knows oneself, one knows what it is to be an other. That is why it is said, “That arises from this, and this also relies on a that.” This is the explanation of how this and that are born in the same instant. However, “The instant one is born one is dying” * - and the instant one dies one is being born; the instant we allow we prohibit; the instant we prohibit we allow; to rely on what we assert is to rely on what we deny; to rely on what we deny is to rely on what we assert. So the Sage does not proceed by this path. He lays all open to the light of heaven - and yet saying this is also to assert a “this is so.”",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 2 }).toUTC().toISO(), // dreamAt: dayBeforeYesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "Escaping relativity through the non-assertion",
      description:
        "A this is a that; a that is a this. That implies one set of assertions and denials; this implies another set of assertions and denials. After all, is there this and that or, after all, is there no this and that? When neither this nor that possesses its double it is called the pivot of the Dao. The pivot first grasps the center of the ring and thereby responds without end. Asserting “this” is one endlessness; denying it is another endlessness. That is why I say, “Nothing is better than opening to the light.” Rather than use meaning to argue “the meaning is not the meaning,” use “not the meaning” to argue “the meaning is not the meaning.” Rather than use horse to argue “a horse is not horse,” use “not horse” to argue “a horse is not horse.” * Heaven and earth are one meaning; the things of the world are one horse.",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 2 }).toUTC().toISO(), // dreamAt: dayBeforeYesterday,
    },
  })

  const symbolsThreeInTheMorning = await db.symbol.findMany({
    where: {
      OR: [{ code: "transcendental" }, { code: "spirit" }, { code: "animals-creatures" }],
    },
  })

  await db.dream.create({
    data: {
      title: "Three in the morning",
      description:
        "To wear out one’s spirit-like powers contriving some view of oneness without understanding that it is all the same is called “three in the morning.” What do I mean by “three in the morning?” A monkey keeper was handing out nuts. “You get three in the morning and four in the evening,” he said. All the monkeys were furious. “All right,” he said. “You get four in the morning and three in the evening.” The monkeys were all delighted. There was no discrepancy between the words and the reality yet contentment and anger were stirred thereby - it is just thus with assertions of “this is so.” Therefore, the Sage brings all into harmony through assertion and denial but rests it upon the balance of heaven: this is called “walking a double path.”",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      time: "MORNING",
      dreamAt: DateTime.now().minus({ day: 2 }).toUTC().toISO(), // dreamAt: dayBeforeYesterday,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsThreeInTheMorning.map((symbol) => ({ id: symbol.id })),
      },
    },
  })

  await db.dream.create({
    data: {
      title: "Critique of the monistic paradoxes",
      description:
        "“Nothing in the world is bigger than the tip of a strand of hair sprouting in autumn, and Mount Tai is small.” “None is longer lived than one who dies as a baby, and Pengzu died young.” “Heaven and earth were born together with me and the ten thousand things of the world and I are one.” Now that we are all one, can I still say anything? Now that I have called us all one, can I have not said anything? One plus speech is two; two plus one is three. If we proceed on from this even an expert calculator cannot reach the end of it, how much less a common man? Hence we can go from nothing to something and then to three; how much further may we go if we start by going from something to something? Do not take this step - the reliance on an asserted “this is so” will come to an end.",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 3 }).toUTC().toISO(), // dreamAt: twoDaysBeforeYesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "Yao and Shun: the power of light",
      description:
        "Yao once asked Shun, “I wish to punish the states of Zong, Kuai, and Xu’ao, as I sit uneasy on my throne. What is the cause of this?” “These three rulers,” Shun replied, “are still living in the midst of brambles. Why should they make you uneasy? Of old, ten suns rose together and the things of the world were all illuminated. How much more true of virtue that approaches the brilliance of the sun?”",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 3 }).toUTC().toISO(), // dreamAt: twoDaysBeforeYesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "Penumbra and shadow",
      description:
        "The penumbra questioned the shadow. “Just now you were moving, now you’ve stopped. Just now you were sitting, now you’re up. How is it you’ve no settled control?” The shadow answered, “Is it because there is something upon which I depend, or that what I depend on has something upon which it depends too? Am I dependent on a snake’s sloughed skin or a locust’s tossed away wings? How can I tell why I am as I am? How can I tell why I’m not as I’m not?”",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 3 }).toUTC().toISO(), // dreamAt: twoDaysBeforeYesterday,
    },
  })

  const symbolsLivingTheFullSpan = await db.symbol.findMany({
    where: {
      OR: [{ code: "transcendental" }, { code: "dao" }, { code: "philosophy" }],
    },
  })

  await db.dream.create({
    data: {
      title: "Living the full span",
      description:
        "Our life spans are bounded, but knowledge knows no bounds. Chase the boundless with the bounded and you will wear yourself out - those who persist will just fall in exhaustion. Stay clear of fame if you do good, of the jailer’s knife if you do bad. Take the natural middle as your steady path and you can preserve your body and fulfill your life, nurture your kin and live your full span.",
      notes: "",
      favorite: false,
      type: "LUCID",
      recall: "CLEAR",
      mood: 3,
      time: "MORNING",
      dreamAt: DateTime.now().minus({ day: 3 }).toUTC().toISO(), // dreamAt: twoDaysBeforeYesterday,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsLivingTheFullSpan.map((symbol) => ({ id: symbol.id })),
      },
    },
  })

  await db.dream.create({
    data: {
      title: "The Commander of the Right",
      description:
        "Wengong Xuan saw the Commander of the Right and cried out in surprise, “What sort of man is this! How is it that he is one-footed? Was this the doing of Heaven or of man? The Commander of the Right replied, “This is Heaven’s doing, not man’s. It was the life that Heaven gave me that caused me to lose my foot. The appearance of a person is bestowed upon him by Heaven, so you can be sure this was the work of Heaven and not man.”",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 3 }).toUTC().toISO(), // dreamAt: twoDaysBeforeYesterday,
    },
  })

  await db.dream.create({
    data: {
      title: "The wild marsh pheasant",
      description:
        "The marsh pheasant must walk ten paces for every sip it takes and a hundred paces for every long drink. Yet it would never wish to be well nurtured within a cage - though it were treated like a king, its spirit would never be content.",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 3 }).toUTC().toISO(), // dreamAt: twoDaysBeforeYesterday,
    },
  })

  const symbolsTheSwimmer = await db.symbol.findMany({
    where: {
      OR: [
        { code: "under-water" },
        { code: "sport" },
        { code: "music" },
        { code: "mermaid" },
        { code: "mysterious" },
        { code: "nature-outdoors" },
        { code: "dao" },
        { code: "philosophy" },
      ],
    },
  })

  await db.dream.create({
    data: {
      title: "The Swimmer",
      description:
        "Confucius was touring Lüliang, where the water falls from a height of thirty fathoms and churns for forty li in rapids that no fish or water creature can swim. He saw a man dive into the water and, taking him for one whom despair had driven to suicide, he ordered his disciples to line the bank and pull the man out. But after the man had swum a few hundred paces, he emerged from the water with his hair streaming down and strolled beneath the cliffs singing. Confucius rushed to question him. “I took you for a ghost, but now I see you’re a man. May I ask if you have some special dao of staying afloat in the water?” “No,” replied the swimmer. “I have no dao. I began with my original endowment, grew up with my nature, and let things come to completion with fate. I go under with the whirlpools and emerge where the water spouts up, following the Dao of the water and never thinking about myself. That’s how I go my way.” Confucius said, “What do you mean by saying that you began with your original endowment, grew up with your nature, and let things come to completion with fate?” “I was born on the dry land and felt comfort on the dry land - that was my original endowment. I grew up with the water and felt comfort in the water - that became my nature. I’m not aware what I do but I do it - that’s fate.”",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 3 }).toUTC().toISO(), // dreamAt: twoDaysBeforeYesterday,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsTheSwimmer.map((symbol) => ({ id: symbol.id })),
      },
    },
  })

  await db.dream.create({
    data: {
      title: "Crippled Shu",
      description:
        "Shu the Deformed - his cheeks are in the shadow of his belly, his shoulders rise above his head, his pigtail points up at the sky, his five viscera are top- wards and his thighs hug his ribs. But by sewing and washing, he gets enough to fill his mouth; by handling a winnow and sifting out the good grain, he makes enough to feed ten. When the ruler calls up the troops, hestands in the crowd and waves good-bye; when they draft workers for state projects, they pass him over because he’s a chronic invalid. But when they are doling out grain to the disabled, he gets three measures and ten bundles of firewood. Those with defor med bodies are thus able to care for themselves and finish out the years Heaven gave them. And how much better to possess deformed virtue!",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 7 }).toUTC().toISO(), // dreamAt: lastWeek,
    },
  })

  const symbolsTheTwoFriends = await db.symbol.findMany({
    where: {
      OR: [
        { code: "friend-colleague" },
        { code: "rain" },
        { code: "music" },
        { code: "dao" },
        { code: "philosophy" },
        { code: "debate" },
      ],
    },
  })

  await db.dream.create({
    data: {
      title: "The Two Friends",
      description:
        "Ziyu and Zisang were friends, and once, when rain came pouring down for ten days straight, Ziyu said, “I bet Zisang is in trouble!” He wrapped up a packet of food and went off to feed his friend. When he reached Zisang’s gate he heard a sound like singing and sobbing to the tones of a zither bring plucked. “Oh, Father! Oh, Mother! Oh, Heaven! Oh, Humanity!” - like a man barely able to gasp out the snatches of song. Ziyu went in. “Why do sing such a song in this way?” he said. “I have been pondering who it is who has brought me to this pass,” said Zisang, “and I have failed to grasp the answer. How could my parents have wished me to be poor? And heaven and earth - heaven covering all without bias and earth bearing up al l without bias - what bias would lead them to make me poor? Seek though I may for the one who has done this, I cannot find him. What has brought me to this pass - it must simply be fate (ming)!”",
      notes: "",
      favorite: false,
      type: "MEDITATION",
      recall: "CLEAR",
      mood: 3,
      time: "EVENING",
      dreamAt: DateTime.now().minus({ day: 7 }).toUTC().toISO(), // dreamAt: lastWeek,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsTheTwoFriends.map((symbol) => ({ id: symbol.id })),
      },
    },
  })

  await db.dream.create({
    data: {
      title: "Puyizi instructs Nie Que",
      description:
        "Nie Que asked Wang Ni four questions and four times replied that he did not know the answer. So Nie Que leapt up in great delight and ran off to tell Puyizi. Puyizi said, “Do you understand now? Emperor Shun of the Youyu clan cannot equal the emperor from the Tai clan. Shun stored up humaneness (ren) in order to gain sway over humanity. Indeed, he gained sway over humanity, but he never began to escape from the world of all that is not human. The emperor from the Tai clan lay down to sleep in comfort and ease and woke in tranquil satisfaction. One moment he saw himself as a horse, the next as an ox. His understanding was pure and trustworthy, his power (de) so genuine - and he never began to enter into the world of all that is not human.",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 7 }).toUTC().toISO(), // dreamAt: lastWeek,
    },
  })

  const symbolsJianWuVisitsJieYu = await db.symbol.findMany({
    where: {
      OR: [
        { code: "trickster" },
        { code: "animals-creatures" },
        { code: "dao" },
        { code: "philosophy" },
      ],
    },
  })

  await db.dream.create({
    data: {
      title: "Jian Wu visits Jie Yu",
      description:
        "Jian Wu went to see the madman Jie Yu. Jie Yu asked him, “What did Rizhongshi tell you?” Jian Wu said, “He said that one who rules over other men creates governing rules and formal regulations based on his own standing - who then dares to disobey and fail to change?” “That type of power (de) is fraud!” said the madman. “Trying to govern that way is like trying to ford the ocean, dig a river, or make a mosquito lift a mountain on its back! Now, when the Sage governs does he govern by external things? He acts only after he is properly set himself and simply sets each person on precisely the task they can do. “Birds fly high to escape the wound of the archer’s arrow, and the mouse burrows deep below the mound of the spirit altar to dodge the danger of those who dig down to smoke him out. Do you have less sense than these two creatures?”",
      notes: "",
      favorite: false,
      type: "MEDITATION",
      recall: "CLEAR",
      mood: 3,
      time: "EVENING",
      dreamAt: DateTime.now().minus({ day: 7 }).toUTC().toISO(), // dreamAt: lastWeek,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsJianWuVisitsJieYu.map((symbol) => ({ id: symbol.id })),
      },
    },
  })

  const symbolsTheManWithNoName = await db.symbol.findMany({
    where: {
      OR: [{ code: "transcendental" }, { code: "dao" }],
    },
  })

  await db.dream.create({
    data: {
      title: "The man with no name",
      description:
        "Heaven-root roamed on the south slope of Mt. Yin until he came to the River Liao. There, he happened to encounter a man with no name and questioned him. “May I ask about ruling the world?” “Get away from me, you bumpkin!” said the man with no name. “What a dreary question! I am just now becoming companion to the Creator, and when I’ve had enough of that, I will mount the back of the bird of distant vacuity, travel beyond the poles of the six directions, wander in the country of Nothing Whatever and settle in the wilds of Boundlessness. How dare you rile up my mind with ruling the world!” He asked again. “If you let your mind wander in the limpid,” said the man with no name, “join your qi with the clear. Follow things the way they are in themselves, free from selfish bias, then the world will be ruled.”",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 9 }).toUTC().toISO(), // dreamAt: past,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsTheManWithNoName.map((symbol) => ({ id: symbol.id })),
      },
    },
  })

  const symbolsThePerfectManAsMirror = await db.symbol.findMany({
    where: {
      OR: [
        { code: "transcendental" },
        { code: "sunny-clear" },
        { code: "dao" },
        { code: "philosophy" },
      ],
    },
  })

  await db.dream.create({
    data: {
      title: "The Perfect Man as mirror",
      description:
        "Do not be the host of fame; do not be a storehouse of schemes; do not be in charge of affairs; do not be the master of knowledge. Embody to the full the limitless and wander where nothing is foreshadowed. Exhaust what you have received from Heaven and be free of all gain - just be empty, that’s all. The mind of the Perfect Man is like a mirror: it does reach out, it does not welcome in: it responds and stores nothing. Therefore, he prevails over all things and suffers no harm.",
      notes: "",
      favorite: false,
      type: "REGULAR",
      recall: "CLEAR",
      mood: 3,
      dreamAt: DateTime.now().minus({ day: 9 }).toUTC().toISO(), // dreamAt: past,
      user: { connect: { id: demoUser.id } },
      symbols: {
        connect: symbolsThePerfectManAsMirror.map((symbol) => ({ id: symbol.id })),
      },
    },
  })

  const demoDreams = await db.dream.findMany({})

  await db.user.update({
    where: { id: demoUser.id },
    data: {
      dreams: {
        connect: demoDreams.map((dream) => ({ id: dream.id })),
      },
    },
  })
}
