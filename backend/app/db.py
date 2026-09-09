import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
from app.curriculum_data import ALL_CURRICULA, ALL_TOPIC_RESOURCES, DEFAULT_GOALS

logger = logging.getLogger("growthos.db")

client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None

SEED_CURRICULUM = {
    "goal": "ml_engineer",
    "year": "1st Year",
    "sequence": [
        {"order": 1, "topic_code": "c_programming", "label": "C Programming Fundamentals"},
        {"order": 2, "topic_code": "python", "label": "Python for ML"},
        {"order": 3, "topic_code": "dsa", "label": "Data Structures & Algorithms"},
        {"order": 4, "topic_code": "communication", "label": "Technical Communication"},
    ],
}

SEED_RESOURCES = [
    {
        "topic_code": "c_programming",
        "videos": [
            {
                "title": "C Programming Tutorial for Beginners",
                "url": "https://www.youtube.com/watch?v=KJgsSFOSQv0",
                "thumbnail": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "CS50 2023 - Lecture 1 - C Programming",
                "url": "https://www.youtube.com/watch?v=34HmS-8g_aA",
                "thumbnail": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "C Programming Full Course for Beginners",
                "url": "https://www.youtube.com/watch?v=rLf3jnHxSmU",
                "thumbnail": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "Introduction to Programming in C - NPTEL IIT Kanpur",
                "url": "https://nptel.ac.in/courses/106104128",
                "thumbnail": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
            },
        ],
        "pdfs": [
            {
                "title": "GNU C Reference Manual (Official GNU Docs)",
                "url": "https://www.gnu.org/software/gnu-c-manual/gnu-c-manual.html",
            },
            {
                "title": "GeeksforGeeks C Programming Complete Guide",
                "url": "https://www.geeksforgeeks.org/c-programming-language/",
            },
            {
                "title": "Modern C by Jens Gustedt (Inria Open Access)",
                "url": "https://inria.hal.science/hal-02383654/document",
            },
            {
                "title": "C Programming Notes & FAQ by Steve Summit",
                "url": "https://www.lysator.liu.se/c/c-faq/c-faq.html",
            },
        ],
        "books": [
            {
                "title": "The C Programming Language (2nd Edition)",
                "author": "Brian W. Kernighan & Dennis M. Ritchie",
                "link": "https://www.amazon.com/Programming-Language-2nd-Brian-Kernighan/dp/0131103628",
            },
            {
                "title": "C Programming: A Modern Approach",
                "author": "K. N. King",
                "link": "http://knking.com/books/c2/",
            },
            {
                "title": "Head First C: A Brain-Friendly Guide",
                "author": "David Griffiths & Dawn Griffiths",
                "link": "https://www.oreilly.com/library/view/head-first-c/9781449345013/",
            },
        ],
        "opportunities": [
            {
                "title": "HackerEarth C Programming Track & Challenges",
                "link": "https://www.hackerearth.com/practice/basic-programming/input-output/basics-of-input-output/practice-problems/",
            },
            {
                "title": "LeetCode Fundamental C Problem Solving",
                "link": "https://leetcode.com/problemset/all/",
            },
            {
                "title": "CodeChef Starter Programming Contests",
                "link": "https://www.codechef.com/contests",
            },
        ],
    },
    {
        "topic_code": "python",
        "videos": [
            {
                "title": "Python for Beginners - Full Course (freeCodeCamp)",
                "url": "https://www.youtube.com/watch?v=eWRfhZUzrAc",
                "thumbnail": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "Python for Machine Learning - Scikit-Learn Tutorial",
                "url": "https://www.youtube.com/watch?v=0B5eIE_1vpU",
                "thumbnail": "https://images.unsplash.com/photo-1516116211223-48a122638e59?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "NumPy & Pandas for Machine Learning Full Course",
                "url": "https://www.youtube.com/watch?v=r-uOLxNrNk8",
                "thumbnail": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "MIT 6.0001 Introduction to CS and Programming in Python",
                "url": "https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/",
                "thumbnail": "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
            },
        ],
        "pdfs": [
            {
                "title": "Official Python 3 Documentation & Tutorial",
                "url": "https://docs.python.org/3/tutorial/",
            },
            {
                "title": "Python Data Science Handbook by Jake VanderPlas",
                "url": "https://jakevdp.github.io/PythonDataScienceHandbook/",
            },
            {
                "title": "Scipy and NumPy Scientific Computing Lecture Notes",
                "url": "https://scipy-lectures.org/",
            },
            {
                "title": "Scikit-Learn Machine Learning in Python User Guide",
                "url": "https://scikit-learn.org/stable/user_guide.html",
            },
        ],
        "books": [
            {
                "title": "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow",
                "author": "Aurélien Géron",
                "link": "https://www.oreilly.com/library/view/hands-on-machine-learning/9781098125967/",
            },
            {
                "title": "Python Crash Course (3rd Edition)",
                "author": "Eric Matthes",
                "link": "https://nostarch.com/pythoncrashcourse2e",
            },
            {
                "title": "Fluent Python: Clear, Concise, and Effective Programming",
                "author": "Luciano Ramalho",
                "link": "https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/",
            },
        ],
        "opportunities": [
            {
                "title": "Kaggle Getting Started Machine Learning Competitions",
                "link": "https://www.kaggle.com/competitions",
            },
            {
                "title": "Google Summer of Code (Python Software Foundation)",
                "link": "https://summerofcode.withgoogle.com/",
            },
            {
                "title": "DrivenData ML for Social Impact Challenges",
                "link": "https://www.drivendata.org/competitions/",
            },
        ],
    },
    {
        "topic_code": "dsa",
        "videos": [
            {
                "title": "Data Structures Easy to Advanced Course - William Fiset",
                "url": "https://www.youtube.com/watch?v=RBSGKlAvoiM",
                "thumbnail": "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "MIT 6.006 Introduction to Algorithms - Lecture 1",
                "url": "https://www.youtube.com/watch?v=ZA-tUyM_y7s",
                "thumbnail": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "Algorithms and Data Structures Tutorial - freeCodeCamp",
                "url": "https://www.youtube.com/watch?v=8hly31xKli0",
                "thumbnail": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "NPTEL Programming, Data Structures And Algorithms",
                "url": "https://nptel.ac.in/courses/106106127",
                "thumbnail": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
            },
        ],
        "pdfs": [
            {
                "title": "Open Data Structures Open Textbook by Pat Morin",
                "url": "https://opendatastructures.org/",
            },
            {
                "title": "GeeksforGeeks Complete DSA Tutorial Reference",
                "url": "https://www.geeksforgeeks.org/data-structures/",
            },
            {
                "title": "Algorithms by Jeff Erickson (UIUC Open Textbook)",
                "url": "https://jeffe.cs.illinois.edu/teaching/algorithms/",
            },
            {
                "title": "Big-O Cheat Sheet & Algorithm Complexity Guide",
                "url": "https://www.bigocheatsheet.com/",
            },
        ],
        "books": [
            {
                "title": "Introduction to Algorithms (CLRS 4th Edition)",
                "author": "Cormen, Leiserson, Rivest, Stein",
                "link": "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/",
            },
            {
                "title": "Grokking Algorithms: An Illustrated Guide",
                "author": "Aditya Bhargava",
                "link": "https://www.manning.com/books/grokking-algorithms",
            },
            {
                "title": "Elements of Programming Interviews in Python",
                "author": "Adnan Aziz, Tsung-Hsien Lee, Amit Prakash",
                "link": "https://elementsofprogramminginterviews.com/",
            },
        ],
        "opportunities": [
            {
                "title": "LeetCode Weekly and Biweekly Coding Contests",
                "link": "https://leetcode.com/contest/",
            },
            {
                "title": "Codeforces Educational Rounds for Beginners",
                "link": "https://codeforces.com/contests",
            },
            {
                "title": "ICPC Regional Collegiate Programming Contest",
                "link": "https://icpc.global/",
            },
        ],
    },
    {
        "topic_code": "communication",
        "videos": [
            {
                "title": "How to Speak by Patrick Winston (MIT OpenCourseWare)",
                "url": "https://www.youtube.com/watch?v=Unzc731iCUY",
                "thumbnail": "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "Technical Writing Course for Engineers (Google Developers)",
                "url": "https://developers.google.com/tech-writing",
                "thumbnail": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "Think Fast, Talk Smart: Communication Techniques (Stanford GSB)",
                "url": "https://www.youtube.com/watch?v=HAnw168huqA",
                "thumbnail": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
            },
            {
                "title": "NPTEL Effective Writing & Professional Communication",
                "url": "https://nptel.ac.in/courses/109104031",
                "thumbnail": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
            },
        ],
        "pdfs": [
            {
                "title": "Google Technical Writing Style Guide & Handbook",
                "url": "https://developers.google.com/style",
            },
            {
                "title": "Writing for Computer Science by Justin Zobel (Notes)",
                "url": "https://people.eng.unimelb.edu.au/jzobel/publications/index.html",
            },
            {
                "title": "Plain Language Action and Information Guidelines",
                "url": "https://www.plainlanguage.gov/guidelines/",
            },
            {
                "title": "Cornell Engineering Professional Communication Handbook",
                "url": "https://www.engineering.cornell.edu/",
            },
        ],
        "books": [
            {
                "title": "The Sense of Style: The Thinking Person's Guide to Writing",
                "author": "Steven Pinker",
                "link": "https://www.penguinrandomhouse.com/books/313328/the-sense-of-style-by-steven-pinker/",
            },
            {
                "title": "Technical Writing 101: A Real-World Guide",
                "author": "Alan S. Pringle & Sarah S. O'Keefe",
                "link": "https://scriptorium.com/books/technical-writing-101/",
            },
            {
                "title": "Crucial Conversations: Tools for Talking When Stakes Are High",
                "author": "Joseph Grenny, Kerry Patterson, Ron McMillan",
                "link": "https://www.cruciallearning.com/crucial-conversations-book/",
            },
        ],
        "opportunities": [
            {
                "title": "Write the Docs Community & Open Source Documentation Sprints",
                "link": "https://www.writethedocs.org/",
            },
            {
                "title": "Toastmasters International Collegiate Clubs",
                "link": "https://www.toastmasters.org/",
            },
            {
                "title": "Call for Proposals (CFP) at Tech Conferences (Sessionize)",
                "link": "https://sessionize.com/",
            },
        ],
    },
]

SEED_QUIZ_BANK = [
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "What is the time complexity of accessing an element in an array by its index?",
        "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
        "correct_option": 0,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "In a static array of size N, what is the worst-case time complexity of inserting an element at the beginning (index 0)?",
        "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        "correct_option": 2,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "What fundamental property of arrays enables constant time O(1) random element access?",
        "options": [
            "Dynamic resizing capabilities",
            "Contiguous memory allocation and pointer arithmetic",
            "Hash bucket distribution",
            "Doubly linked memory nodes",
        ],
        "correct_option": 1,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "When a dynamic array (such as std::vector or ArrayList) reaches capacity and resizes by doubling, what is the amortized time complexity per insertion?",
        "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
        "correct_option": 0,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "What is the time complexity of inserting a new node at the head of a singly linked list given the head pointer?",
        "options": ["O(n)", "O(log n)", "O(1)", "O(n log n)"],
        "correct_option": 2,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "What is a primary disadvantage of a singly linked list compared to a contiguous array?",
        "options": [
            "Extra memory overhead for node pointers and lack of cache locality",
            "Inability to delete the first element in O(1)",
            "Fixed size determined at compile time",
            "Requires O(n^2) time to append at the tail with a tail pointer",
        ],
        "correct_option": 0,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "In a doubly linked list, how many pointer updates are required to delete an internal node when given a direct reference to that node?",
        "options": ["1 pointer update", "2 pointer updates", "O(n) pointer updates", "4 pointer updates"],
        "correct_option": 1,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "Which algorithmic technique is commonly used to detect a cycle in a singly linked list in O(n) time and O(1) auxiliary space?",
        "options": [
            "Dijkstra's Shortest Path Algorithm",
            "Floyd's Tortoise and Hare (Slow and Fast Pointers)",
            "Binary Search on Node Memory Addresses",
            "Kruskal's Minimum Spanning Tree",
        ],
        "correct_option": 1,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "Which fundamental data structure operates strictly on a Last-In, First-Out (LIFO) principle?",
        "options": ["Queue", "Stack", "Min-Heap", "Circular Buffer"],
        "correct_option": 1,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "Which of the following computational tasks is most naturally solved using a stack?",
        "options": [
            "Evaluating postfix (Reverse Polish) arithmetic expressions",
            "Finding the shortest path in an unweighted graph via BFS",
            "Scheduling jobs on a first-come, first-served basis",
            "Implementing a Least Recently Used (LRU) cache",
        ],
        "correct_option": 0,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "What condition occurs when attempting to push an element onto a fixed-size array-based stack that is already full?",
        "options": ["Stack Underflow", "Memory Segmentation Fault", "Stack Overflow", "Deadlock"],
        "correct_option": 2,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "What is the time complexity to retrieve the top element without removing it (peek/top) in a standard stack?",
        "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
        "correct_option": 0,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "Which principle governs the order of insertion and removal in a standard Queue data structure?",
        "options": ["LIFO (Last-In First-Out)", "FIFO (First-In First-Out)", "Priority Heap Ordering", "Random Access Protocol"],
        "correct_option": 1,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "Why is a circular queue often preferred over a naive linear array implementation of a queue?",
        "options": [
            "It enables O(1) binary search across elements",
            "It reuses deallocated space at the front without shifting elements",
            "It sorts elements automatically upon insertion",
            "It allows infinite elements without memory limits",
        ],
        "correct_option": 1,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "Which standard graph traversal algorithm fundamentally relies on a FIFO Queue?",
        "options": [
            "Depth-First Search (DFS)",
            "Breadth-First Search (BFS)",
            "Prim's Minimum Spanning Tree",
            "Tarjan's Strongly Connected Components Algorithm",
        ],
        "correct_option": 1,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "In a double-ended queue (deque), what is the time complexity of insertions and deletions at either end?",
        "options": ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
        "correct_option": 0,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "What is the worst-case time complexity of Binary Search on a sorted array of N elements?",
        "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        "correct_option": 1,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "What is the Big-O time complexity of two nested loops where both outer and inner loops iterate from 1 to N?",
        "options": ["O(n)", "O(n log n)", "O(n^2)", "O(2^n)"],
        "correct_option": 2,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "Which of the following complexity classes grows the fastest as N approaches infinity?",
        "options": ["O(n^2)", "O(n log n)", "O(2^n)", "O(n^3)"],
        "correct_option": 2,
    },
    {
        "year": "1st Year",
        "topic_code": "dsa",
        "prompt": "What is the best, average, and worst-case time complexity of Merge Sort?",
        "options": [
            "O(n log n) in all cases",
            "O(n) best case, O(n^2) worst case",
            "O(n^2) in all cases",
            "O(log n) best case, O(n log n) worst case",
        ],
        "correct_option": 0,
    },
]

SEED_CODING_BANK = [
    {
        "title": "Reverse a String",
        "description": "Write a program that reads a string from standard input and prints its reverse to standard output.",
        "difficulty": "Easy",
        "starter_code": "import sys\n\ns = sys.stdin.read().strip()\n# Print the reversed string\nprint(s[::-1])\n",
        "test_cases": [
            {"input": "hello\n", "expected_output": "olleh"},
            {"input": "growthos\n", "expected_output": "sohtworg"},
            {"input": "racecar\n", "expected_output": "racecar"}
        ]
    },
    {
        "title": "Find Maximum in Array",
        "description": "Write a program that reads space-separated integers from standard input and prints the maximum integer to standard output.",
        "difficulty": "Easy",
        "starter_code": "import sys\n\nnums = list(map(int, sys.stdin.read().split()))\n# Print the maximum number\nif nums:\n    print(max(nums))\n",
        "test_cases": [
            {"input": "3 7 2 9 1\n", "expected_output": "9"},
            {"input": "-10 -5 -20 -1\n", "expected_output": "-1"},
            {"input": "42\n", "expected_output": "42"}
        ]
    },
    {
        "title": "Check Palindrome",
        "description": "Write a program that reads a string from standard input. If it reads the same forwards and backwards, print 'true', otherwise print 'false'.",
        "difficulty": "Easy",
        "starter_code": "import sys\n\ns = sys.stdin.read().strip()\n# Print 'true' or 'false'\nis_pal = s == s[::-1]\nprint('true' if is_pal else 'false')\n",
        "test_cases": [
            {"input": "radar\n", "expected_output": "true"},
            {"input": "python\n", "expected_output": "false"},
            {"input": "madam\n", "expected_output": "true"}
        ]
    },
    {
        "title": "Count Vowels",
        "description": "Write a program that reads a string from standard input and counts the total number of vowels (a, e, i, o, u, case-insensitive). Print the integer count to standard output.",
        "difficulty": "Easy",
        "starter_code": "import sys\n\ns = sys.stdin.read().strip()\n# Count and print vowels\nvowels = set('aeiouAEIOU')\nprint(sum(1 for ch in s if ch in vowels))\n",
        "test_cases": [
            {"input": "GrowthOS\n", "expected_output": "2"},
            {"input": "aeiouAEIOU\n", "expected_output": "10"},
            {"input": "rhythm\n", "expected_output": "0"}
        ]
    },
    {
        "title": "Nth Fibonacci Number",
        "description": "Given non-negative integer N on standard input, print the N-th Fibonacci number to standard output (where fib(0)=0, fib(1)=1, fib(2)=1, fib(3)=2, ...).",
        "difficulty": "Easy",
        "starter_code": "import sys\n\nn = int(sys.stdin.read().strip())\n# Print the Nth Fibonacci number\ndef fib(x):\n    a, b = 0, 1\n    for _ in range(x):\n        a, b = b, a + b\n    return a\nprint(fib(n))\n",
        "test_cases": [
            {"input": "0\n", "expected_output": "0"},
            {"input": "7\n", "expected_output": "13"},
            {"input": "10\n", "expected_output": "55"}
        ]
    }
]

def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.MONGO_URI)
    return client

def get_db() -> AsyncIOMotorDatabase:
    global db
    if db is None:
        db = get_client()[settings.DB_NAME]
    return db

async def init_db() -> None:
    database = get_db()

    # Users unique index
    users_collection = database["users"]
    await users_collection.create_index("email", unique=True)
    logger.info("Unique index on users.email verified/created.")

    # Goals seeding (replace/upsert with 10 approved pathways)
    goals_collection = database["goals"]
    await goals_collection.delete_many({})
    await goals_collection.insert_many(DEFAULT_GOALS)
    logger.info(f"Seeded {len(DEFAULT_GOALS)} approved career pathway goals.")

    # Curriculum index and seeding (upsert 40 curricula across 10 goals x 4 years)
    curriculum_collection = database["curriculum"]
    await curriculum_collection.create_index([("goal", 1), ("year", 1)], unique=True)
    logger.info("Unique compound index on curriculum (goal, year) verified/created.")

    # Reset curriculum collection to ensure exact 40 approved curricula
    await curriculum_collection.delete_many({})

    for curr in ALL_CURRICULA:
        await curriculum_collection.update_one(
            {"goal": curr["goal"], "year": curr["year"]},
            {"$set": curr},
            upsert=True,
        )
    logger.info(f"Seeded/updated {len(ALL_CURRICULA)} research-backed curriculum paths.")

    # Resources index and seeding (upsert all unique topics)
    resources_collection = database["resources"]
    await resources_collection.create_index("topic_code", unique=True)
    logger.info("Unique index on resources.topic_code verified/created.")

    for res in ALL_TOPIC_RESOURCES:
        await resources_collection.update_one(
            {"topic_code": res["topic_code"]},
            {"$set": res},
            upsert=True,
        )
    logger.info(f"Seeded/updated {len(ALL_TOPIC_RESOURCES)} topic resource catalogs.")

    # Phase 3: Cohorts indexes
    cohorts_collection = database["cohorts"]
    await cohorts_collection.create_index("institution_id")
    logger.info("Index on cohorts.institution_id verified/created.")

    # Phase 3: Quiz Bank compound index and seeding
    quiz_bank_collection = database["quiz_bank"]
    await quiz_bank_collection.create_index([("year", 1), ("topic_code", 1)])
    logger.info("Compound index on quiz_bank (year, topic_code) verified/created.")

    quiz_bank_count = await quiz_bank_collection.count_documents({"year": "1st Year", "topic_code": "dsa"})
    if quiz_bank_count == 0:
        await quiz_bank_collection.insert_many(SEED_QUIZ_BANK)
        logger.info(f"Seeded {len(SEED_QUIZ_BANK)} genuine DSA questions for 1st Year.")
    else:
        logger.info(f"Quiz bank already contains {quiz_bank_count} DSA questions for 1st Year.")

    # Phase 3: Assessments index
    assessments_collection = database["assessments"]
    await assessments_collection.create_index("cohort_id")
    logger.info("Index on assessments.cohort_id verified/created.")

    # Phase 3: Submissions compound index
    submissions_collection = database["submissions"]
    await submissions_collection.create_index([("assessment_id", 1), ("user_id", 1)])
    logger.info("Compound index on submissions (assessment_id, user_id) verified/created.")

    # Coding Contest: Collections, Indexes, and Seeding
    coding_bank_collection = database["coding_bank"]
    await coding_bank_collection.create_index("title")
    logger.info("Index on coding_bank.title verified/created.")

    coding_bank_count = await coding_bank_collection.count_documents({})
    if coding_bank_count == 0:
        await coding_bank_collection.insert_many(SEED_CODING_BANK)
        logger.info(f"Seeded {len(SEED_CODING_BANK)} coding questions into coding_bank.")
    else:
        logger.info(f"Coding bank already contains {coding_bank_count} questions.")

    contest_sessions_collection = database["contest_sessions"]
    await contest_sessions_collection.create_index("cohort_id")
    logger.info("Index on contest_sessions.cohort_id verified/created.")

    code_submissions_collection = database["code_submissions"]
    await code_submissions_collection.create_index([("contest_id", 1), ("question_id", 1), ("user_id", 1)])
    logger.info("Compound index on code_submissions verified/created.")

async def close_db() -> None:
    global client, db
    if client is not None:
        client.close()
        client = None
        db = None
        logger.info("Database connection closed.")
