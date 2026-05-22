import string
from search_agents.tools import scrape_url, web_search
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from .agents import (
    writer_chain,
    critic_chain
)
import re

import environ

env = environ.Env()

environ.Env.read_env()

class AgentState(TypedDict) :
    query : str
    search_results: list
    scraped_content: str
    report: str
    feedback: str



# def search_node(state) -> dict:

#     print("\n"+" ="*50)
#     print("step 1 - search agent is working ...")
#     print("="*50)


#     search_results = web_search.invoke({
#             "query" : state["query"]
#         })

#     state["search_results"] = search_results

#     print("\n search result ",state['search_results'])

#     print("\n"+" ="*50)
#     print("step 2 - Reader agent is scraping top resources ...")
#     print("="*50)


#     top_url = state['search_results'][0]['url'] #some changes requires here -> we cant just select the first link to generate report


#     print("\nTop URL selected:")
#     print(top_url)

#     scraped_content = scrape_url.invoke({"url": top_url})

#     state['scraped_content'] = scraped_content
#     print("\nscraped content: \n", state['scraped_content'])

#     print("\n"+" ="*50)
#     print("step 3 - Writer is drafting the report ...")
#     print("="*50)

#     # research_combined = (
#     #     f"SEARCH RESULTS : \n {state['search_results']} \n\n"
#     #     f"DETAILED SCRAPED CONTENT : \n {state['scraped_content']}"
#     # )

#     return state

def search_node(state):

    search_results = web_search.invoke({
        "query": state["query"]
    })

    top_url = search_results[0]["url"]

    scraped_response = scrape_url.invoke({
        "url": top_url
    })

    scraped_text = scraped_response.results[0].text

    return {

        "search_results": search_results,

        "scraped_content": scraped_text,
    }

async def writer_node(state):

    print ("\nWriting report...\n")
    research_combined = (
        f"SEARCH RESULTS : \n {state['search_results']} \n\n"
        f"DETAILED SCRAPED CONTENT : \n {state['scraped_content']}"
        )

    report = ""
    async for chunk in writer_chain.astream({
        "topic" : state["query"],
        "research" : research_combined
    }):
        # print(type(chunk))
        # print(chunk)
        # print(dir(chunk))

        # break
        text = str(chunk)

        if text:
            report += text

        
    return {
        "report" : report
    }
    # state["report"] = writer_chain.invoke({
    #     "topic" : state["query"],
    #     "research" : research_combined
    # })

    # print("\n Final Report\n",state['report'])

    # return state

    #critic report 
async def critic_node(state):

    # print("\n"+" ="*50)
    print("step 4 - critic is reviewing the report ")
    # print("="*50)

    feedback = ""

    async for chunk in critic_chain.astream({
        "report": state["report"]

    }):

        text = str(chunk)

        if text:

            feedback += text

            # yield {
            #     "type" : "feedback_chunk",
            #     "content" : text
            # }

    return {
        "feedback": feedback
    }

    # state["feedback"] = critic_chain.invoke({
    #     "report":state['report']
    # })

    # print("\n critic report \n", state['feedback'])

    # return state


workflow = StateGraph(AgentState)
workflow.add_node("search", search_node)
# workflow.add_node("scrape", scrape_node)
workflow.add_node("write", writer_node)
workflow.add_node("critic", critic_node)

# Set flow
workflow.add_edge(START, "search")
# workflow.add_edge("search", "scrape")
workflow.add_edge("search", "write")
workflow.add_edge("write", "critic")
workflow.add_edge("critic", END)

app = workflow.compile()

# # testing
# input = {"query" :"The impact of AI on the job market in 2026"}
# events = app.astream_events(input=input, version="v2")

# async for event in events:
#     print(event)

