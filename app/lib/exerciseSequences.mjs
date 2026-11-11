// One concrete, continuous coaching example per catalogue drill. These are
// teaching choices within the free-play tasks, not mandatory match patterns.
// ; next beat, | simultaneous actions, > pass, @ off-ball run, ~ carry, ! shot.
// Receive a loose ball with a run to its exact coordinate. A shot to GK is a save.
const scripts = `
1 A~42,15|B~12,58|C~92,42|F~58,92;A~28,30|B~28,65|C~80,28|F~72,78
2 A~20,15|B~44,92|C~80,15|F~90,48;A~32,30|B~55,75|C~65,30|F~75,55
3 A~35,72|B~65,72;A~25,50|B~75,50;A~35,30|B~65,30
4 A~35,15|B~80,25|C~65,88;A~50,35|B~65,45|C~50,65
5 A~18,65|B~58,45;A~40,65|B~88,45
6 A~28,48|B~72,52;A~12,35|B~90,68
7 A~35,30|B~88,65;A~35,40|B~88,55;A~15,55|B~68,40;A~15,65|B~68,30;A~35,65|B~88,30;A~35,55|B~88,40;A~15,40|B~68,55;A~15,30|B~68,65;A~18,25|B~65,70
8 A~65,25|B~65,65|C~85,85;A~80,25|B~80,55|C~85,70;C~55,65
9 A>42,25|B>88,70;A@35,45|B@80,90;A@42,25|B@88,70;A~55,25|B~88,50
10 A~50,8|B~95,50;A~70,15|B~75,70;A~80,35|B~35,50;A~95,50|B~50,8
11 A>B;A@20,80;B>A
12 A>B;B>A;B@82,70;A>B
13 A>B;B~78,30;B>A
14 A>B|C@88,50;B>C
15 A>B|B@50,42;B>A
16 A>B|A@50,85;B>C
17 A>B;C>F;B>A;F>C
18 A>B;B>C|B@65,75;C>B
19 A>B;B~35,45|A@70,22;B>A
20 A~50,68;A>C
21 A~85,20|D@62,28
22 A>B;B>J
23 A~45,40|B@70,90;A>B
24 A>B;B!95,80
25 A>J;A@40,75;J>A
26 A>B|C@90,75;B>C
27 A>J;J>B
28 A>B;B~75,55|C@20,65
29 A>B|C>F;B~85,28|F~85,75
30 A>B;B>J2;J2>C
31 A>B|C@82,65;B>C
32 A>C
33 A>J1;J1>B
34 A>J;J>B
35 A>B|D@65,25;B~90,35
36 A>B;A@50,10;B>A
37 J1>A;A>B;B>J2
38 A>B;A@72,40;B>A
39 A>J;J>C
40 A>B|C@85,65;B>C
41 A~75,50|D@65,45;A!100,50
42 A~50,35;A>B;B!100,50
43 B@55,85;A>B
44 A>B;B>C;C!100,50
45 A>B|D@65,40;B~72,62;B!100,60
46 A>B|E@62,65;B>C
47 B>A;A~60,75;A!100,65
48 B@75,88;A>B
49 B@72,55;A>B
50 B>A;A>B|B@65,60;B!100,55
51 GK>A;A>C
52 GK>B;B>C;C>F
53 A>C;C>F;F~90,20
54 A>J;J>B;B!100,80
55 J1>A;A>B;B>J2
56 GK>A;A>J1
57 A>B;B>C;C~90,65
58 A~45,50;A>B;B>J
59 A>B;B>F;F>J2
60 GK>B;B~95,80
61 A>B|D@40,40|E@55,65
62 A>B|D@65,25|E@78,50
63 T>E
64 A>D;D>J|A@36,35
65 A>B;B>E;B@60,65|C@30,60
66 A>B|D@50,80|E@72,50
67 A>C|B@72,12
68 E>D;D~5,20|C@45,65
69 J>A;A>B
70 A>B|D2@62,75
71 A>C;C>B;B!100,50
72 A>C|B@82,78;C>B
73 GK>A;A>GK;GK>B
74 A>B;B>J
75 A>B;A@75,70|C@30,85
76 C@78,15;A~65,50
77 A>J;J>B
78 B>J;J>C
79 A>C|B@78,40;A@40,30
80 B@65,18;A>C;C!100,50
81 GK1>A;A>B;B>F
82 GK>B|E@45,20|D@30,40
83 A>B;B>E;E!0,80|C@62,75
84 GK1>A;A>C;C>F
85 GK1>A;A>B;B>C
86 GK1>A;A>GK1;GK1>B
87 A>B;B>C;C>F
88 D!GK1;GK1>A;A>B
89 A>C;C>GK1;GK1>B
90 B>F|A@35,40;F!100,50
91 GK1>B;B>F;F>I
92 A>B;B>H|E@80,60
93 GK1>A;A>C|D@45,38|D2@58,50
94 A>D;D>E|E@65,25|B@32,20
95 B>GK1;GK1>A;A>C
96 A>B|B@80,72|GK@82,62
97 A>F|B@92,70;F!100,50
98 GK1>C;C>A;A>GK1
99 A>B;B>F;F>C
100 GK1>A;A>B|C@75,88;B>F
101 A~40,20|B~60,85;A~30,40|B~70,65
102 A>B;B~65,35;B>C
103 A~40,30|B~65,65;A~55,35|B~45,70
104 A>B|A@25,75;B>C
105 A>B;B~65,30;B>C
106 A~70,65|D@55,40
107 A>B;B>C;C>A
108 A~30,15|B~80,85;A~42,48|B~65,65;A~30,70|B~30,15
109 A~35,60;A>B
110 A~60,15|B~40,85;A~60,5|B~40,95;A~75,25|B~25,75
111 A>B;B~80,30
112 A>C|E@60,55
113 A>J;A@20,70;J>A
114 A>B;B>C
115 A>B;B>C
116 B@55,35;A>B
117 A>B|D@38,45
118 A>J;J>B
119 A>D;D>E
120 B@35,70;A>C
121 A>B;A@70,45;B>A
122 A>B|C@85,65;B>C
123 B@75,10;A>B
124 B@78,35;A>B
125 A>B;B>C
126 A>C;C>F;F>B
127 A>B;B>C|A@65,35;B@25,20;C>A
128 A>B;B>F
129 A>B;B>C
130 A>B;B>C;C!100,50
131 A>B;B~70,65;B!100,60
132 A>B;B!100,65
133 A!GK|B@85,65;GK^B;B!100,65
134 A>C;C!100,55
135 A>C;C!100,60
136 A>B|D@70,35;B!100,50
137 A>B;B!100,15
138 A>B;B~75,30;B!100,40
139 A>D;D~58,30;D>B;B!100,45
140 A>B;B!100,65
141 A~80,20|D@70,35
142 A>B|D@75,60
143 A>B|E@80,65
144 A>B|E@87,65
145 A>B|D@75,45
146 A~50,40;A>D;D>E
147 B@80,8|E@85,20;A>B
148 A>B|D@68,45
149 A>B|D2@60,50
150 A>C|D@80,65|E@85,80
151 A>B|D@50,20|D2@75,25
152 A>B|E2@80,48
153 A>C|E@65,80
154 A>B|D@65,15|E@65,35
155 A>C|F@78,55|E2@82,60
156 A>C|D@75,50|D2@88,45
157 A>C|D2@68,88|E@80,65
158 A>B;B>D;D>E
159 A>C|E@76,40|D2@90,55
160 A>C|D@60,45|E@65,65
161 A>D;D>E|B@50,60
162 A>D;D>J|E@10,35;J>E
163 A>D;D>E|B@50,40
164 A>D;D>GK|E@40,80
165 A>B|E@70,45
166 A>D;D>E
167 A!GK;GK>D|C@30,35
168 A>D;D>D2|B@50,35
169 A>D;D>D2
170 A>D;D>J
171 GK>A;A>C
172 A>C;C>F
173 A>B;B>A;A>F;F>C
174 A>B;B>C;C>F
175 A~45,50;A>B
176 A>B|F@85,75;B>F
177 A>C;C>B
178 GK>A;A>GK;GK>B
179 A>B;B>C;C>F
180 A>B;B>F
181 A>B;A@50,70;B>A
182 A>C;C>B
183 A>D;D>E
184 B@82,8;A>C
185 A>C|B@30,35;A@65,12;C>A
186 A>D;D>J
187 A>D;D>E|C@92,70
188 GK>B;B>C
189 A>B;B!100,55
190 A>D;D>D2
191 GK>A;A>C;C>H
192 GK1>B;B>A|D@40,30|E@45,65
193 GK1>B;B>F;F>D;D>D2|A@20,35
194 GK1>C|D2@72,35|D@60,25
195 GK1>C;C>A;A>GK1
196 A>B;B>F|A@20,50
197 GK>B;B>I
198 A>F;F>C;C>E;E>E2
199 GK1>C;C>A;A>F
200 GK1>A;A>C;C>H
`;
export const EXERCISE_SEQUENCES = Object.fromEntries(scripts.trim().split('\n').map(line=>{const [id,...rest]=line.split(' ');return [Number(id),rest.join(' ').split(';').map(beat=>beat.split('|').map(token=>{const [,from,operator,to]=token.match(/^([^>@~!^]+)([>@~!^])(.+)$/);return {from,to,kind:{'>':'pass','@':'run','~':'dribble','!':'shot','^':'rebound'}[operator]};}))];}));
// Starts already in the phase named in the exercise, rather than inventing a
// transfer from the first player in the static diagram.
export const SEQUENCE_BALLS = {37:['J1'],47:['B'],50:['B'],63:['T'],68:['E'],88:['D']};
export const SEQUENCE_NOTES = {
 9:'Spela bollen framför dig, löp runt och hämta samma boll innan nästa drivning.',
 17:'Paren passar i turordning så att bollarna inte möts i korsningen.',
 63:'Här visas nästa spelstart: T sätter en ny boll i spel efter att den föregående lämnat planen.',
 73:'Träningssekvens med målvaktsstöd. Anpassa återspel till de regler som gäller för er spelform.',
 133:'Här parerar målvakten ut en retur och B följer upp. Ingen extra boll sätts in.',
 139:'B återerövrar bollen från D innan avslutet.',
 146:'D vinner bollen och använder E som stöd.',
 158:'D bryter efter passningen till B och spelar vidare till E.',
 166:'Exemplet visar genomspel till E. D2 är det alternativa bakre stödet.',
 183:'Exemplet visar djupledspass till E. D2 finns kvar som säkrare alternativ.',
 193:'Röd bollvinst följs av kontring. A återhämtar för att skydda djupet.',
 198:'Efter hörnan vinner E bollen och spelar E2. Blå behöver välja återpress eller fall.'
};
