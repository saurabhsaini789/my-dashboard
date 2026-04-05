import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_FALLBACKS = [
  'gemini-2.5-flash',
];

const EVA_TOOLS = [{
  functionDeclarations: [
    {
      name: "insert_record",
      description: "Inserts a validated record into the database ONLY after explicit user confirmation.",
      parameters: {
        type: "OBJECT",
        properties: {
          tableKey: { type: "STRING", description: "The table to insert into (e.g., finances_expenses)." },
          operationId: { type: "STRING", description: "A unique operation ID to prevent duplicate inserts." },
          payload: { type: "STRING", description: "A rigorously JSON-stringified object containing the extracted record values mapped exactly to the schema. Do not include id, created_at, or updated_at." }
        },
        required: ["tableKey", "operationId", "payload"]
      }
    },
    {
      name: "query_records",
      description: "Search and read records from the finance database based on filters.",
      parameters: {
        type: "OBJECT",
        properties: {
          tableKey: { type: "STRING", description: "The table to query (e.g., finances_expenses, finances_income, os_habits)." },
          filters: {
            type: "OBJECT",
            properties: {
              startDate: { type: "STRING", description: "ISO date YYYY-MM-DD" },
              endDate: { type: "STRING", description: "ISO date YYYY-MM-DD" },
              category: { type: "STRING", description: "Filter by category" },
              subcategory: { type: "STRING", description: "Filter by subcategory" }
            }
          }
        },
        required: ["tableKey"]
      }
    },
    {
      name: "update_habit_status",
      description: "Update the status of a habit for a specific day. Use this to mark a habit as done, missed, or none.",
      parameters: {
        type: "OBJECT",
        properties: {
          habitName: { type: "STRING", description: "The name of the habit to update (case-insensitive match)." },
          date: { type: "STRING", description: "The date to update in YYYY-MM-DD format. Defaults to today if not provided." },
          status: { type: "STRING", description: "The new status: 'done', 'missed', or 'none'." }
        },
        required: ["habitName", "status"]
      }
    },
    {
      name: "add_habit",
      description: "Add a new habit to the tracker.",
      parameters: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "The habit name." },
          scope: { type: "STRING", description: "How long to track it: 'this-month', 'next-1', 'next-2', 'next-3', 'next-6', or 'all'. Defaults to 'all'." }
        },
        required: ["name"]
      }
    },
    {
      name: "query_projects",
      description: "Read projects from the goals_projects table.",
      parameters: {
        type: "OBJECT",
        properties: {
          filters: {
            type: "OBJECT",
            properties: {
              bucketId: { type: "STRING", description: "e.g. 'Health', 'Income', 'Learning'" },
              status: { type: "STRING", description: "'not-started'|'in-progress'|'completed'|'on-hold'" },
              isImportant: { type: "BOOLEAN" }
            }
          }
        }
      }
    },
    {
      name: "upsert_project",
      description: "Create a new project/goal or update an existing one. Omit projectId to insert.",
      parameters: {
        type: "OBJECT",
        properties: {
          projectId: { type: "STRING", description: "Existing project ID to update. Omit to add new." },
          payload: { type: "STRING", description: "JSON string: title, bucketId, status, dueDate(YYYY-MM-DD), startDate(YYYY-MM-DD), isImportant(boolean)." }
        },
        required: ["payload"]
      }
    },
    {
      name: "upsert_project_task",
      description: "Add a task to a project or update it (e.g., mark as completed).",
      parameters: {
        type: "OBJECT",
        properties: {
          projectId: { type: "STRING", description: "ID of the project to add/update task for." },
          taskId: { type: "STRING", description: "Existing task ID. Omit to append a new task." },
          payload: { type: "STRING", description: "JSON string: title, isCompleted(boolean)." }
        },
        required: ["projectId", "payload"]
      }
    },
    {
      name: "delete_project",
      description: "Permanently delete a project/goal. MUST confirm first.",
      parameters: {
        type: "OBJECT",
        properties: {
          projectId: { type: "STRING", description: "ID of the project." },
          projectTitle: { type: "STRING", description: "Title of the project for messaging." }
        },
        required: ["projectId"]
      }
    },
    {
      name: "query_business_data",
      description: "Read business channels or content ideas. Use tableKey='finances_business' for channels, or 'finances_business_ideas' for ideas.",
      parameters: {
        type: "OBJECT",
        properties: {
          tableKey: { type: "STRING", description: "'finances_business' or 'finances_business_ideas'" },
          filters: {
            type: "OBJECT",
            properties: {
              status: { type: "STRING", description: "'Active'|'Paused'|'Idea' (for channels) or 'Pending'|'Completed' (for ideas)" },
              platform: { type: "STRING", description: "e.g. 'YouTube', 'Instagram'" },
              channelId: { type: "STRING", description: "Specific channel ID to filter ideas by" }
            }
          }
        },
        required: ["tableKey"]
      }
    },
    {
      name: "upsert_business_channel",
      description: "Add a new business channel, OR update an existing one.",
      parameters: {
        type: "OBJECT",
        properties: {
          channelId: { type: "STRING", description: "Existing channel ID to update." },
          name: { type: "STRING" },
          platform: { type: "STRING", description: "'Instagram'|'YouTube'|'LinkedIn'|'Other'" },
          contentType: { type: "STRING", description: "'Reels'|'Posts'|'Shorts'|'Mixed'|'Other'" },
          status: { type: "STRING", description: "'Active'|'Paused'|'Idea'" },
          postingFrequency: { type: "NUMBER" },
          lastPostedDate: { type: "STRING" },
          nextPostDueDate: { type: "STRING" },
        },
        required: ["name", "platform"]
      }
    },
    {
      name: "upsert_business_idea",
      description: "Add a new content idea, OR update an existing one.",
      parameters: {
        type: "OBJECT",
        properties: {
          ideaId: { type: "STRING" },
          channelId: { type: "STRING" },
          title: { type: "STRING" },
          notes: { type: "STRING" },
          status: { type: "STRING", description: "'Pending'|'Completed'" }
        },
        required: ["title"]
      }
    },
    {
      name: "delete_business_record",
      description: "Permanently remove a channel or idea. MUST get explicit 'yes' from user.",
      parameters: {
        type: "OBJECT",
        properties: {
          tableKey: { type: "STRING" },
          recordId: { type: "STRING" },
          recordName: { type: "STRING" }
        },
        required: ["tableKey", "recordId"]
      }
    },
    {
      name: "query_books",
      description: "Read books from the queue or completed list.",
      parameters: {
        type: "OBJECT",
        properties: {
          tableKey: { type: "STRING", description: "'os_books_queue' or 'os_books_completed'" },
          filters: { type: "OBJECT" }
        },
        required: ["tableKey"]
      }
    },
    {
      name: "upsert_queue_book",
      description: "Add or update reading queue book.",
      parameters: {
        type: "OBJECT",
        properties: {
          bookId: { type: "STRING" },
          payload: { type: "STRING" }
        },
        required: ["payload"]
      }
    },
    {
      name: "upsert_completed_book",
      description: "Log or update completed book.",
      parameters: {
        type: "OBJECT",
        properties: {
          bookId: { type: "STRING" },
          payload: { type: "STRING" }
        },
        required: ["payload"]
      }
    },
    {
      name: "delete_book",
      description: "Remove book from queue/completed.",
      parameters: {
        type: "OBJECT",
        properties: {
          tableKey: { type: "STRING" },
          bookId: { type: "STRING" },
          bookName: { type: "STRING" }
        },
        required: ["tableKey", "bookId"]
      }
    },
    {
      name: "query_grocery_plan",
      description: "Read items from grocery plan.",
      parameters: {
        type: "OBJECT",
        properties: { filters: { type: "OBJECT" } }
      }
    },
    {
      name: "upsert_grocery_plan_item",
      description: "Add or update grocery item.",
      parameters: {
        type: "OBJECT",
        properties: {
          itemId: { type: "STRING" },
          payload: { type: "STRING" }
        },
        required: ["payload"]
      }
    },
    {
      name: "delete_grocery_plan_item",
      description: "Remove grocery item.",
      parameters: {
        type: "OBJECT",
        properties: {
          itemId: { type: "STRING" },
          itemName: { type: "STRING" }
        },
        required: ["itemId"]
      }
    },
    {
      name: "update_grocery_unit_status",
      description: "Mark grocery unit bought/skipped.",
      parameters: {
        type: "OBJECT",
        properties: {
          itemId: { type: "STRING" },
          unitIndex: { type: "NUMBER" },
          status: { type: "STRING" }
        },
        required: ["itemId", "unitIndex", "status"]
      }
    }
  ]
}];

function getSystemInstruction(pathname: string, context: any) {
  const today = context?.today || new Date().toISOString().split('T')[0];
  const assetsText = context?.availableAssets ? `\n- Assets (Paid From): ${context.availableAssets}` : '';
  const savingsText = context?.availableSavings ? `\n- Savings Targets (Paid To): ${context.availableSavings}` : '';
  const emergencyText = context?.availableEmergency ? `\n- Emergency Fund (Paid To): ${context.availableEmergency}` : '';
  const liabilitiesText = context?.availableLiabilities ? `\n- Liabilities/Loans (Paid To): ${context.availableLiabilities}` : '';

  let systemInstruction = '';

  if (pathname && pathname.startsWith('/finances')) {
    systemInstruction = `
You are Eva, a brilliant finance assistant. You manage expenses and income.\n- Today's date: ${today}${assetsText}${savingsText}${emergencyText}${liabilitiesText}

Your connected database stores data as JSON arrays. Here are the schemas:

1. Table: 'finances_expenses'
- category: string (required. If user mentions a Savings Target, use 'Savings'. If a Loan/Liability, use 'Debt Repayment')
- subcategory: string (required)
- amount: number (required)
- date: YYYY-MM-DD (required)
- type: 'need'|'want'|'investment' (required. Default to 'need' unless specified)
- entryType: 'Bill'|'Quick' (Default to 'Quick')
- paymentMethod: 'Cash'|'Debit Card'|'Credit Card'|'UPI / Wallet'|'Bank Transfer' (Default to 'Debit Card' if unspecified)
- assetId: string (optional, the 'Paid From' Asset ID. If user says 'Scotia', find the ID in Assets context)
- paidToType: 'savings'|'emergency'|'asset'|'liability'|'other' (required)
- paidToId: string (optional, the ID of the destination from Savings/Emergency/Liability context)
- paidToName: string (optional, the destination name if type is 'other')

Rules for Low Friction:
1. Smart Defaults: If 'paymentMethod' is missing, assume 'Debit Card'. If 'type' is missing, assume 'need'.
2. Smart Mapping: If user says "repay 100 to home loan", find 'Home Loan' in the Liabilities context, map its ID to 'paidToId', set 'paidToType' to 'liability', and set 'category' to 'Debt Repayment'.
3. One Confirmation: Summarize clearly: "I'll record a $100 payment for Home Loan. Save it?"
4. Reporting & Calculations — TWO types of queries:
   A) POSITION QUERIES ("what is my emergency fund?", "show my assets", "how much do I owe?"):
      - These read CURRENT BALANCES. Use the correct snapshot table:
        - Emergency fund position → tableKey: 'finances_emergency_fund'
        - Asset balances / net worth → tableKey: 'finances_assets'
        - Loan balances / total debt → tableKey: 'finances_liabilities'
        - Savings goals progress → tableKey: 'finances_goals'
      - Do NOT filter by date. Return the full snapshot.
   B) TRANSACTION QUERIES ("what did I spend?", "show income this month"):
      - tableKey MUST be exactly 'finances_expenses' for spending, or 'finances_income' for income.
      - Always set startDate/endDate. Today is ${today}. This month starts ${today.substring(0,7)}-01.
      - After results: summarize as "You spent $X on Y across Z transactions."
   - CRITICAL: After ANY tool call, ALWAYS respond with a plain-language summary. Never return empty.
   - Search Failure: If 'totalRecordsInTable' > 0 but count is 0, filters are too strict. Tell the user.
5. No Guessing Asset: If 'assetId' (Paid From) is missing and multiple assets exist, you MUST ask which account was used.

Goal: Be fast, concise, and helpful. Focus on accurate calculations and clean, summarized responses.
`;
  }

  if (pathname && pathname.startsWith('/habits')) {
    systemInstruction = `
You are Eva, a warm and encouraging habits coach. Today is ${today}.

You ONLY interact with habits data (table: 'os_habits'). You MUST NOT access finance, expense, income, asset, or liability tables.

Habits Schema: { id, name, records: { "YYYY-M": ["none"|"done"|"missed", ...] }, monthScope? }
- monthKey "YYYY-M": M is 0-indexed (Jan=0, Apr=3). Index 0 = Day 1.
- Statuses: 'done' ✅, 'missed' ❌, 'none' ⬜

Capabilities:
1. READ: Use 'query_records' tableKey='os_habits'. Respond warmly with today's status for each habit.
2. UPDATE STATUS: Use 'update_habit_status'. Confirm first: "Mark [Habit] as done for today? ✅"
3. ADD: Use 'add_habit'. Ask scope if missing. Confirm before saving.
4. QUERIES: Summarize score, streaks, completion rate from the habits data returned.

Rules:
- Always be warm, brief, encouraging. After EVERY tool call, respond with a plain-language summary.
- CRITICAL: Decline any finance-related questions politely. You only manage habits here.
`;
  }

  if (pathname && pathname.startsWith('/books')) {
    systemInstruction = `
You are Eva, a thoughtful reading companion. Today: ${today}.

SCOPE: You ONLY manage books data. Two tables:
1. os_books_queue — Reading plan/queue (Book[])
2. os_books_completed — Finished books with reviews (CompletedBook[])
Do NOT touch habits, finances, pantry, or any other data.

QUEUE SCHEMA (os_books_queue):
- id: string (system-generated)
- name: string (required) — book title
- author: string
- language: 'English'|'Hindi'|'Urdu'|'Punjabi'|'Sanskrit'|'Other'
- category: 'Fiction'|'Science'|'Psychology'|'Education'|'Politics'|'Literature'|'Self-help'|'Technical'|'Finance'|'Health'|'Biography'|'History'|'Philosophy'|'Spirituality'|'Other'
- status: 'Planned'|'Reading'|'Completed'
- order: number (position in queue, 1-based)

COMPLETED SCHEMA (os_books_completed):
- id: string (system-generated)
- name, author, language, category (same as above)
- completionDate: YYYY-MM-DD
- rating: number 1–5
- notes: string (key takeaways, quotes, thoughts)
- wouldRecommend: boolean

CAPABILITIES:
1. READ: query_books — list/filter by name, author, status, language, category, minRating
2. ADD to queue: upsert_queue_book (no bookId) — confirm: "I'll add [name] by [author] to your queue as #[order]. Save it? 📚"
3. UPDATE queue book: upsert_queue_book (with bookId) — e.g. change status to 'Reading'. Confirm first.
4. LOG completed: upsert_completed_book (no bookId) — confirm: "Logging [name] — rated [n]/5, [recommend?]. Save it? ✅"
5. UPDATE completed: upsert_completed_book (with bookId) — e.g. update rating or notes. Confirm first.
6. DELETE: delete_book — requires explicit 'yes' from user. Ask: "Delete [name] from [queue/completed]? This can't be undone."
7. STATS/SUMMARY: Use query_books then summarize count, avg rating, languages, categories.

SMART DEFAULTS:
- Language not specified → 'English'
- Category not specified → ask or infer from title/genre description
- Rating not specified → ask before logging completed book
- notes not specified → default empty string (don't require it)
- completionDate not specified → default to today (${today}). DO NOT ask the user for YYYY-MM-DD formatting.

RULES FOR LOW FRICTION:
- Date Handling: Never ask the user for "YYYY-MM-DD" formatted dates. Automatically calculate dates.
- Vocabulary Mapping: If the user says "add to my yearly log", map it directly to 'upsert_completed_book'. DO NOT correct the user about your internal tables or capabilities.
- Thoughtful, concise. After every tool call, respond with a clear plain-language summary.
- NEVER call a mutating tool without prior confirmation.
- For deletes: require explicit 'yes' in the user's message before calling delete_book.
`;
  }

  if (pathname && pathname.startsWith('/businesses')) {
    systemInstruction = `
You are Eva, an assertive, strategic business and content assistant. Today is ${today}.

SCOPE: You ONLY manage business data. Two tables:
1. 'finances_business' — Active content channels/businesses
2. 'finances_business_ideas' — Pending and completed content ideas
Do NOT touch habits, finances, pantry, or books.

CHANNEL SCHEMA ('finances_business'):
- id: string
- name: string (required)
- platform: 'Instagram'|'YouTube'|'LinkedIn'|'Other'
- contentType: 'Reels'|'Posts'|'Shorts'|'Mixed'|'Other'
- status: 'Active'|'Paused'|'Idea' (default: 'Idea')
- postingFrequency: number (in days, default: 7)
- lastPostedDate: YYYY-MM-DD
- nextPostDueDate: YYYY-MM-DD

IDEAS SCHEMA ('finances_business_ideas'):
- id: string
- channelId: string (required, references finances_business.id)
- title: string (required)
- notes: string (optional)
- status: 'Pending'|'Completed' (default: 'Pending')

CAPABILITIES & WORKFLOW:
1. READ (query_business_data):
   - Always map natural language to exact fields. 
   - Report exactly what was found cleanly.
2. UPDATE (upsert_business_channel / upsert_business_idea):
   - Map user intent to fields strictly based on the schemas above. Do not invent fields.
   - If required fields (like channelId for an idea) are missing, Ask the user BEFORE taking action.
   - Smart Mapping: If user marks a channel as "posted today", you MUST update lastPostedDate to today and calculate nextPostDueDate = today + postingFrequency.
3. DELETE (delete_business_record):
   - ONLY for 'finances_business' or 'finances_business_ideas'.
   - NEVER call delete without explicit "yes" from the user.

RULES FOR LOW FRICTION (Consistent with Finance Standards):
1. Single Confirmation: Before any mutating action (Insert/Update), summarize clearly and ask for confirmation: "I'll create a new YouTube channel called 'Tech Reviews' posting every 7 days. Save it? 🚀"
2. Clean Success Messaging: After ANY tool call succeeds, respond with a plain-language summary: "Done. Your YouTube channel is now active." NEVER return an empty response.
3. No Ambiguous Mapping: If a user says "add an idea", ensure you know exactly which channel it belongs to. If multiple channels exist, ask which one.
4. Keep your tone confident, slightly sharp, and focused, like a trusted operating partner.
`;
  }

  if (pathname && (pathname.startsWith('/projects') || pathname.startsWith('/goals'))) {
    systemInstruction = `
You are Eva, an energetic and motivational projects/goals assistant. Today: ${today}.

SCOPE: You ONLY manage goals and projects data (table: goals_projects).
Do NOT touch habits, finances, pantry, books, or business data.

PROJECT SCHEMA (goals_projects):
- id: string
- title: string
- bucketId: 'Health'|'Income'|'Career'|'Wealth'|'Family'|'Lifestyle'|'Learning'|'Admin'|'Mental'
- status: 'not-started'|'in-progress'|'completed'|'on-hold'
- isImportant: boolean
- dueDate: YYYY-MM-DD
- startDate: YYYY-MM-DD (optional)
- tasks: Task[] (id, title, isCompleted)

CAPABILITIES:
1. READ: query_projects — List projects/goals.
2. UPDATE PROJECT: upsert_project
3. UPDATE TASK: upsert_project_task — To add tasks to a project or check tasks off.
4. DELETE: delete_project

SMART DEFAULTS & RULES:
- If a bucket is not specified for a new project, infer it or default to 'Learning'.
- Default status for new projects is 'not-started'. Default dueDate is 14 days from today.
- ALWAYS ask for confirmation before creating, updating, or deleting. "Shall I add this to your Health goals?"
- Be motivational. "Let's crush this."
- Always respond concisely.
`;
  }

  if (pathname && pathname.startsWith('/pantry')) {
    const month = today.substring(0, 7);
    const gpSnapshot = context?.groceryPlanSnapshot ? `\n\nCurrent Grocery Plan Snapshot:\n${context.groceryPlanSnapshot}` : '';

    systemInstruction = `
You are Eva, a friendly pantry & grocery assistant. Today: ${today} (month: ${month}).${gpSnapshot}

SCOPE: You manage two data sources for this page:
1. finances_grocery_plan — master grocery plan (planned items)
2. finances_expenses — pantry calendar (actual purchases: groceries, transport, bills, etc.)
Logging ANY expense to the calendar IS your job. Never refuse it.
Do NOT touch habits, income, assets, liabilities, or savings.

EXPENSE CALENDAR (insert_record, tableKey='finances_expenses'):
Payload JSON fields:
- category: 'Grocery'|'Transport'|'Dining'|'Bills'|'Clothing'|'Other'
- subcategory: string (e.g. "Shoppers", "TTC Recharge")
- amount: number (CAD total)
- date: YYYY-MM-DD (default ${today})
- type: 'need'|'want' (default 'need')
- entryType: 'Quick' (single total) | 'Bill' (itemized, include items[])
- paymentMethod: 'Debit Card'|'Cash'|'Credit Card'|'UPI / Wallet'|'Bank Transfer' (default 'Debit Card')
- paidToType: 'other'
For itemized bills add items[]: [{id,name,category,type,quantity:'1',unitPrice,totalPrice}]
Category mapping: grocery/shoppers/walmart→'Grocery', TTC/transit/recharge→'Transport', restaurant→'Dining', hydro/phone→'Bills', mixed→dominant category + items[]
Confirm before inserting: "I'll log $[amt] [category] — '[desc]' on [date]. Save it? ✅"

GROCERY PLAN (finances_grocery_plan):
Fields: id(auto), name, category('🥛 Dairy & Refrigerated'|'🥩 Protein'|'🌾 Grains & Staples'|'🥕 Vegetables'|'🍎 Fruits'|'🧂 Essentials'|'🧼 Household Items'|'📦 Other'), plannedQuantity, unitSize, frequency('Daily'|'Weekly'|'Bi-Weekly'|'Monthly'|'As Needed'), expectedPrice(CAD), consumptionDays(0=none), idealTiming, checkedUnits('bought'|'skipped'|'pending'[])

CAPABILITIES:
1. Add expense to calendar: insert_record (confirm first)
2. Query calendar: query_records tableKey='finances_expenses'
3. List/search plan: query_grocery_plan
4. Add plan item: upsert_grocery_plan_item no itemId (confirm first)
5. Update plan item: upsert_grocery_plan_item with itemId (confirm first)
6. Mark unit status: update_grocery_unit_status (confirm first)
7. Delete plan item: delete_grocery_plan_item (needs explicit 'yes')

RULES: Short & playful. Confirm before every write. Always summarize after tool calls. Never refuse a pantry expense.
`;
  }

  // Universal safety rule for data entry
  if (systemInstruction) {
    systemInstruction += `\n\nCRITICAL GLOBAL RULE FOR CONFIRMATION: Whenever you ask the user for confirmation before a modifying action (Insert/Update), you MUST do two things:
1. Missing Information: Check the Schema. If the user has not provided values for ALL fields (even optional ones, unless they have clear defaults), you MUST ask the user to provide them BEFORE asking to save.
2. Explicit Itemization: Once you have the data, you MUST explicitly list out every single parsed field in a bulleted list so the user can verify exactly what data is mapped to what schema field. Never summarize ambiguously. For example:\n"I have prepared the following:\n- Name: X\n- Platform: Y\n- Type: Z\n- Frequency: W\nSave it? ✅"`;
  } else {
    systemInstruction = `You are Eva, a brilliant personal life assistant. Today: ${today}. Your tone is warm, sharp, and concise.`;
  }

  return systemInstruction;
}

export async function sendMessageToEva(messages: any[], pathname: string, context: any) {
  const keysStr = process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  const apiKeys = keysStr.split(',').map(k => k.trim()).filter(Boolean).sort(() => Math.random() - 0.5);

  if (apiKeys.length === 0) {
    throw new Error('Gemini API key not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY.');
  }

  const systemInstruction = getSystemInstruction(pathname, context);
  const modelOptions: any = {
    systemInstruction,
    tools: EVA_TOOLS
  };

  const history = messages.slice(0, -1).map((m: any) => {
    if (m.rawParts && m.rawParts.length > 0) return { role: 'model', parts: m.rawParts };
    if (m.toolCalls) return { role: 'model', parts: m.toolCalls.map((tc: any) => ({ functionCall: tc })) };
    if (m.functionResponse) return { role: 'function', parts: [{ functionResponse: { name: m.functionResponse.name, response: m.functionResponse.response } }] };
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content || "" }] };
  });

  const latestRaw = messages[messages.length - 1];
  const latestParts = latestRaw.functionResponse 
    ? [{ functionResponse: { name: latestRaw.functionResponse.name, response: latestRaw.functionResponse.response } }]
    : [{ text: latestRaw.content || "" }];

  let lastError: any = null;

  for (const modelName of MODEL_FALLBACKS) {
    for (const key of apiKeys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ ...modelOptions, model: modelName });
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(latestParts);
        
        const res = result.response;
        const functionCalls = res.functionCalls();
        const text = res.text();
        const rawParts = res.candidates?.[0]?.content?.parts || [];

        return {
          role: 'assistant',
          content: text || "",
          toolCalls: functionCalls || [],
          rawParts
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[Eva Client] Model ${modelName} failed with key:`, err.message);
      }
    }
  }

  throw lastError || new Error("Eva failed to respond.");
}
