import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

TOPIC_CHECKS_DATA = {
    "comp_thinking": [
        {
            "prompt": "What is the primary objective of decomposition in computational thinking?",
            "options": ["Breaking a complex problem into smaller, manageable sub-problems", "Writing machine code directly", "Executing code faster using parallel threads", "Combining multiple algorithms into a single loop"],
            "correct_option": 0
        },
        {
            "prompt": "Which component of computational thinking focuses on identifying similarities or trends across problems?",
            "options": ["Abstractions", "Pattern Recognition", "Algorithmic Efficiency", "Decomposition"],
            "correct_option": 1
        },
        {
            "prompt": "What does 'Abstraction' mean in computer science?",
            "options": ["Hiding unnecessary implementation details and exposing only essential features", "Removing all comments from source code", "Converting high-level code to assembly", "Increasing memory usage to improve readability"],
            "correct_option": 0
        },
        {
            "prompt": "What is the worst-case time complexity of linear search on an array of N elements?",
            "options": ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
            "correct_option": 2
        },
        {
            "prompt": "Which data structure operates on a Last-In, First-Out (LIFO) basis?",
            "options": ["Queue", "Stack", "Binary Search Tree", "Linked List"],
            "correct_option": 1
        },
        {
            "prompt": "What is the main requirement for applying Binary Search to an array?",
            "options": ["The array must contain unique elements", "The array must be sorted", "The array size must be a power of 2", "The array elements must be positive integers"],
            "correct_option": 1
        },
        {
            "prompt": "In algorithm design, what does Big-O notation quantify?",
            "options": ["The exact number of lines of code", "The upper bound of time or space growth relative to input size", "The exact execution time in milliseconds", "The size of the compiled binary in bytes"],
            "correct_option": 1
        },
        {
            "prompt": "Which of the following describes a pseudocode?",
            "options": ["Executable code written in C++", "An informal high-level description of an algorithm for human reading", "Machine language instruction set", "A formal mathematical proof"],
            "correct_option": 1
        },
        {
            "prompt": "What is the time complexity of accessing an element in an array by its index?",
            "options": ["O(1)", "O(N)", "O(log N)", "O(N^2)"],
            "correct_option": 0
        },
        {
            "prompt": "What characterises a greedy algorithm?",
            "options": ["Making the locally optimal choice at each step hoping to find a global optimum", "Trying all possible combinations recursively", "Dividing the problem into equal halves at every step", "Using dynamic programming tables to store previous results"],
            "correct_option": 0
        }
    ],
    "c_programming": [
        {
            "prompt": "What is the correct format specifier for printing a double value in C using printf?",
            "options": ["%d", "%f or %lf", "%c", "%s"],
            "correct_option": 1
        },
        {
            "prompt": "Which keyword is used to prevent a variable from being modified in C?",
            "options": ["static", "volatile", "const", "extern"],
            "correct_option": 2
        },
        {
            "prompt": "What does malloc() return if memory allocation fails in C?",
            "options": ["0 (as an int)", "NULL pointer", "A negative integer error code", "It throws an exception"],
            "correct_option": 1
        },
        {
            "prompt": "What is the output of `sizeof(char)` in standard C?",
            "options": ["1 byte", "2 bytes", "4 bytes", "Depends on OS architecture"],
            "correct_option": 0
        },
        {
            "prompt": "What operator is used to access the memory address of a variable in C?",
            "options": ["*", "&", "->", "."],
            "correct_option": 1
        },
        {
            "prompt": "Which header file must be included to use free() and malloc()?",
            "options": ["<stdio.h>", "<stdlib.h>", "<string.h>", "<math.h>"],
            "correct_option": 1
        },
        {
            "prompt": "What is a dangling pointer in C?",
            "options": ["A pointer initialized to NULL", "A pointer pointing to a memory location that has been freed", "A pointer that points to another pointer", "An uninitialized pointer"],
            "correct_option": 1
        },
        {
            "prompt": "How are strings represented in standard C?",
            "options": ["As a built-in String object", "As an array of characters terminated by a null character '\\0'", "As a linked list of characters", "As a dynamic vector of bytes"],
            "correct_option": 1
        },
        {
            "prompt": "Which of the following is true about C structures (struct)?",
            "options": ["Members share the same memory space", "Members are allocated separate memory locations sequentially", "Structures cannot contain pointers", "Functions can be declared inside C structures directly"],
            "correct_option": 1
        },
        {
            "prompt": "What is the result of dereferencing a NULL pointer in C?",
            "options": ["Returns 0", "Returns NULL", "Undefined Behavior (typically Segmentation Fault)", "Returns -1"],
            "correct_option": 2
        }
    ],
    "communication_habits": [
        {
            "prompt": "What is the core principle of effective technical communication?",
            "options": ["Clarity, conciseness, and audience awareness", "Using complex jargon to show expertise", "Writing as long as possible", "Avoiding diagrams and visual aids"],
            "correct_option": 0
        },
        {
            "prompt": "In an engineering status update, what format is widely recommended for reporting progress?",
            "options": ["BLUF (Bottom Line Up Front)", "Freeform narrative without dates", "Unorganized bullet points", "Writing code snippets only"],
            "correct_option": 0
        },
        {
            "prompt": "What does active listening involve during technical reviews?",
            "options": ["Formulating your reply while the speaker is talking", "Focusing, understanding, responding, and clarifying feedback", "Interrupting immediately when you disagree", "Nodding without taking notes"],
            "correct_option": 1
        },
        {
            "prompt": "What is the primary purpose of a technical documentation README?",
            "options": ["To list all git commits", "To provide quick start guide, overview, and usage instructions for a project", "To store API keys", "To write personal blog posts"],
            "correct_option": 1
        },
        {
            "prompt": "When communicating an architectural decision, what artifact is standard in modern software teams?",
            "options": ["Architecture Decision Record (ADR)", "Pull Request title", "Slack message", "Code comment"],
            "correct_option": 0
        },
        {
            "prompt": "How should constructive code review feedback be framed?",
            "options": ["Focusing on the code rather than personalizing criticisms", "Directly criticizing the author's intelligence", "Ignoring minor issues completely", "Rejecting PRs without giving reasons"],
            "correct_option": 0
        },
        {
            "prompt": "What is the purpose of a 5-Whys analysis in incident post-mortems?",
            "options": ["To assign blame to the developer", "To drill down to the root cause of an issue systematically", "To count the number of bugs in a release", "To document API parameters"],
            "correct_option": 1
        },
        {
            "prompt": "What does asynchronous communication mean in software teams?",
            "options": ["Communication that does not require immediate real-time response", "Communicating using encrypted tokens only", "Communicating only during standup meetings", "Never writing documentation"],
            "correct_option": 0
        },
        {
            "prompt": "What is a key requirement for clear technical presentation slides?",
            "options": ["Dense walls of text on every slide", "High contrast, clear visual diagrams, and concise key points", "No headings or slide numbers", "Using 10 different font styles"],
            "correct_option": 1
        },
        {
            "prompt": "Why is empathy important in cross-functional engineering communication?",
            "options": ["It helps understand user needs and non-technical stakeholders' constraints", "It speeds up CPU execution time", "It eliminates the need for software testing", "It replaces technical design docs"],
            "correct_option": 0
        }
    ],
    "career_exploration": [
        {
            "prompt": "What distinguishes a Backend Engineer from a Frontend Engineer?",
            "options": ["Backend focuses on server-side logic, databases, and APIs; Frontend on user interfaces", "Backend writes CSS animations", "Frontend manages database indexes and clusters", "There is no difference"],
            "correct_option": 0
        },
        {
            "prompt": "What does T-shaped engineering skills mean?",
            "options": ["Deep expertise in one domain combined with broad general knowledge across disciplines", "Knowing only 2 programming languages", "Specializing exclusively in Testing", "Working only on Tuesday and Thursday"],
            "correct_option": 0
        },
        {
            "prompt": "What is the role of a DevOps / SRE engineer?",
            "options": ["Designing marketing landing pages", "Ensuring system reliability, automation, CI/CD pipelines, and infrastructure scaling", "Writing mobile application UI components", "Manual quality assurance testing"],
            "correct_option": 1
        },
        {
            "prompt": "What is an ATS (Applicant Tracking System)?",
            "options": ["Software used by recruiters to parse, rank, and track job applications automatically", "An automated code compiler", "A cloud server hosting platform", "An internal payroll system"],
            "correct_option": 0
        },
        {
            "prompt": "What is the purpose of an open-source contribution to a student portfolio?",
            "options": ["Demonstrating real-world collaboration, code quality, and git proficiency", "Getting paid directly by GitHub", "Replacing college degree requirements entirely", "Hiding code from public view"],
            "correct_option": 0
        },
        {
            "prompt": "What does a Product Manager (PM) primarily focus on?",
            "options": ["Defining product strategy, user requirements, and prioritizing roadmap features", "Writing database queries for production APIs", "Configuring Kubernetes clusters", "Designing company logos"],
            "correct_option": 0
        },
        {
            "prompt": "What is the STAR method used for in behavioral interviews?",
            "options": ["Situation, Task, Action, Result for answering competency questions", "Software Testing and Automated Regression", "System Tuning and Resource Allocation", "Structured Array Sorting"],
            "correct_option": 0
        },
        {
            "prompt": "What is the key advantage of building production-grade personal projects?",
            "options": ["Proving end-to-end implementation skills beyond simple classroom assignments", "Guaranteeing immediate venture capital funding", "Bypassing technical interviews completely", "Generating passive ad revenue"],
            "correct_option": 0
        },
        {
            "prompt": "What does a Data Engineer specialize in?",
            "options": ["Building scalable data pipelines, ETL processes, and data warehouses", "Creating CSS layouts for mobile apps", "Setting up Wi-Fi routers", "Designing product logos"],
            "correct_option": 0
        },
        {
            "prompt": "What is networking in a professional career context?",
            "options": ["Building relationships with industry peers, mentors, and professionals", "Configuring TCP/IP routers", "Sending bulk spam emails", "Following influencers on social media"],
            "correct_option": 0
        }
    ],
    "dsa_core": [
        {
            "prompt": "What is the average time complexity of searching for a key in a Hash Table?",
            "options": ["O(1)", "O(log N)", "O(N)", "O(N^2)"],
            "correct_option": 0
        },
        {
            "prompt": "In a Max-Heap, where is the maximum element located?",
            "options": ["At the root node", "At the leftmost leaf", "At the rightmost leaf", "At the median index"],
            "correct_option": 0
        },
        {
            "prompt": "Which algorithm technique does QuickSort utilize?",
            "options": ["Divide and Conquer", "Greedy Method", "Dynamic Programming", "Backtracking"],
            "correct_option": 0
        },
        {
            "prompt": "What traversal order of a Binary Search Tree produces elements in sorted ascending order?",
            "options": ["In-order Traversal", "Pre-order Traversal", "Post-order Traversal", "Level-order Traversal"],
            "correct_option": 0
        },
        {
            "prompt": "What is the worst-case time complexity of QuickSort?",
            "options": ["O(N log N)", "O(N^2)", "O(N)", "O(2^N)"],
            "correct_option": 1
        },
        {
            "prompt": "Which data structure is most suitable for implementing Breadth-First Search (BFS) on a graph?",
            "options": ["Queue", "Stack", "Priority Queue", "Binary Search Tree"],
            "correct_option": 0
        },
        {
            "prompt": "What is the main advantage of a Doubly Linked List over a Singly Linked List?",
            "options": ["Traversal can be performed in both forward and backward directions", "Uses less memory", "O(1) random access by index", "Requires no pointer manipulation"],
            "correct_option": 0
        },
        {
            "prompt": "What property must a balanced AVL tree satisfy for every node?",
            "options": ["The height difference between left and right subtrees is at most 1", "All leaves must be at the same depth", "Nodes must have exactly 2 children", "Values must be even integers"],
            "correct_option": 0
        },
        {
            "prompt": "What is the space complexity of a recursive depth-first search on a tree of height H?",
            "options": ["O(H)", "O(1)", "O(2^H)", "O(H^2)"],
            "correct_option": 0
        },
        {
            "prompt": "Which algorithm is used to find the shortest path from a single source to all vertices in a weighted graph with non-negative edge weights?",
            "options": ["Dijkstra's Algorithm", "Kruskal's Algorithm", "Prim's Algorithm", "Floyd-Warshall Algorithm"],
            "correct_option": 0
        }
    ]
}

# Helper to generate 10 generic high-quality questions for any other topic_code
def generate_generic_checks_for_topic(topic_code: str) -> list:
    topic_clean = topic_code.replace('_', ' ').title()
    return [
        {
            "prompt": f"What is the foundational concept behind {topic_clean} in modern software engineering?",
            "options": [
                f"Structuring core principles and systematic problem-solving within {topic_clean}",
                "Writing non-functional boilerplate code without testing",
                "Manually managing hardware clock signals",
                "Replacing all data structures with global variables"
            ],
            "correct_option": 0
        },
        {
            "prompt": f"Why is mastering {topic_clean} essential for technical interviews and production systems?",
            "options": [
                "It enables scalable, robust, and maintainable software architecture",
                "It guarantees 100% reduction in CPU temperature",
                "It allows bypassing security authentication completely",
                "It is required by browser vendors for displaying HTML"
            ],
            "correct_option": 0
        },
        {
            "prompt": f"Which of the following represents a best practice when implementing {topic_clean}?",
            "options": [
                "Applying modular design, clean separation of concerns, and error handling",
                "Hardcoding credentials and database connection strings",
                "Ignoring edge cases and error logging",
                "Disabling static analysis and linting rules"
            ],
            "correct_option": 0
        },
        {
            "prompt": f"In the lifecycle of a software project, how does {topic_clean} impact long-term maintenance?",
            "options": [
                "High cohesion and low coupling reduce technical debt and bug rates",
                "It increases technical debt and prevents code refactoring",
                "It forces developers to rewrite the codebase every week",
                "It has zero impact on software maintenance"
            ],
            "correct_option": 0
        },
        {
            "prompt": f"What tool or methodology is commonly paired with {topic_clean} for verification?",
            "options": [
                "Automated unit testing, integration testing, and CI/CD pipelines",
                "Manual paper calculations only",
                "Randomly restarting production servers",
                "Deleting git commit history periodically"
            ],
            "correct_option": 0
        },
        {
            "prompt": f"When evaluating performance tradeoffs in {topic_clean}, what should engineers analyze?",
            "options": [
                "Time complexity, space complexity, and resource utilization",
                "The number of lines of comments written",
                "The font size of the IDE editor",
                "The age of the developer's laptop"
            ],
            "correct_option": 0
        },
        {
            "prompt": f"What is a common pitfall to avoid when working with {topic_clean}?",
            "options": [
                "Premature optimization and neglecting boundary condition checks",
                "Writing thorough unit test assertions",
                "Documenting API schemas using OpenAPI standards",
                "Using version control branches for features"
            ],
            "correct_option": 0
        },
        {
            "prompt": f"How does {topic_clean} integrate with cloud-native distributed environments?",
            "options": [
                "By leveraging stateless design patterns, containerization, and microservices",
                "By requiring a single monolithic physical server running DOS",
                "By storing all session state in local text files on client browsers",
                "By disabling network interfaces completely"
            ],
            "correct_option": 0
        },
        {
            "prompt": f"What is the expected outcome of completing a practical project focused on {topic_clean}?",
            "options": [
                "A working, tested software artifact demonstrating domain mastery",
                "A 100-page theoretical essay with no code",
                "An unhandled runtime error in production",
                "Deletion of existing database tables"
            ],
            "correct_option": 0
        },
        {
            "prompt": f"What key metric indicates mastery of {topic_clean}?",
            "options": [
                "Ability to design, implement, and debug solutions independently under constraints",
                "Memorizing syntax rules without understanding execution flow",
                "Copying code from online forums without comprehension",
                "Writing code that compiles only half the time"
            ],
            "correct_option": 0
        }
    ]

async def seed_topic_checks():
    client = AsyncIOMotorClient('mongodb+srv://GrowthOS:sk%40786@cluster0.6egjrzi.mongodb.net/?appName=Cluster0')
    db = client['growthos_v2']
    
    # Fetch all unique topic_codes from curriculum collection
    curricula = await db['curriculum'].find({}).to_list(1000)
    topic_codes = set()
    for c in curricula:
        for seq in c.get('sequence', []):
            if 'topic_code' in seq:
                topic_codes.add(seq['topic_code'])

    print(f"Found {len(topic_codes)} unique topic codes across curricula.")

    inserted_count = 0
    updated_topics = 0

    for topic_code in sorted(list(topic_codes)):
        # Determine questions to seed
        if topic_code in TOPIC_CHECKS_DATA:
            questions = TOPIC_CHECKS_DATA[topic_code]
        else:
            questions = generate_generic_checks_for_topic(topic_code)

        # Check existing count in topic_checks
        existing_count = await db['topic_checks'].count_documents({'topic_code': topic_code})
        if existing_count >= 10:
            print(f"Skipping {topic_code}: already has {existing_count} topic checks.")
            continue

        # Clear existing if fewer than 10 to ensure clean set
        await db['topic_checks'].delete_many({'topic_code': topic_code})

        docs_to_insert = []
        for q in questions:
            docs_to_insert.append({
                'topic_code': topic_code,
                'prompt': q['prompt'],
                'options': q['options'],
                'correct_option': q['correct_option'],
            })

        res = await db['topic_checks'].insert_many(docs_to_insert)
        inserted_count += len(res.inserted_ids)
        updated_topics += 1
        print(f"Seeded {len(res.inserted_ids)} checks for topic: '{topic_code}'")

    print(f"\n[SUCCESS] Topic checks seeding complete! Seeded {inserted_count} total questions across {updated_topics} topics.")

if __name__ == '__main__':
    asyncio.run(seed_topic_checks())
