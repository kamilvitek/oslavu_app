"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(item => item !== index)
        : [...prev, index]
    );
  };

  const faqItems = [
    {
      question: "What's a Conflict Score?",
      answer: "A Conflict Score is a proprietary algorithm that analyzes potential scheduling conflicts between your event and other events in the same city. It considers factors like audience overlap, event proximity, timing, and event type to give you a score from 0-20, where lower scores indicate higher conflict risk."
    },
    {
      question: "What's audience overlap?",
      answer: "Audience overlap tells you how many of the same people would likely attend both your event and competing events. We calculate this by analyzing event categories, genres, demographics, and how close events are scheduled together. For example, if you're planning a Rock concert and another Rock festival is happening just days before, there's a high audience overlap because the same music fans would be interested in both. The higher the overlap percentage, the more likely you'll compete for the same attendees, which can significantly impact your ticket sales and attendance. This helps you avoid scheduling conflicts that could hurt your event's success."
    },
    {
      question: "Which events are covered?",
      answer: "We cover a comprehensive range of events including conferences, meetups, festivals, concerts, sports events, and local gatherings. Our data sources include major platforms like Ticketmaster, AI-powered online research with Perplexity, plus automated web scraping from thousands of local event websites to ensure we don't miss any events that could impact your attendance."
    },
    {
      question: "Can I request a missing event?",
      answer: "Absolutely! If you know of an important event that we haven't captured, you can contact us directly and we'll add it to our database. We're constantly expanding our coverage and appreciate community input to make our conflict detection even more accurate."
    },
    {
      question: "Which geographies?",
      answer: "Currently, we provide comprehensive coverage for major cities worldwide, with special focus on Czech Republic. We're rapidly expanding to cover more regions. If you need coverage for a specific city, let us know and we can prioritize adding it to our database."
    },
    {
      question: "Who is behind Oslavu?",
      answer: "Oslavu was founded by Kamil Vítek, a Czech high school student and designer who’s been creating websites and UX design projects since sixteen."
    },
    {
      question: "What makes Oslavu different from other tools?",
      answer: "Unlike generic calendar tools, Oslavu is specifically designed for event organizers. We combine multiple data sources (APIs + web scraping) to provide comprehensive event coverage, use AI-powered audience overlap analysis, and focus specifically on helping you avoid scheduling conflicts that could hurt your attendance and lower your revenue."
    }
  ];

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about Oslavu and how it can help optimize your event dates
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {faqItems.map((item, index) => (
            <Card key={index} className="overflow-hidden group hover:bg-[#f9fafb] transition-colors duration-200">
              <button
                onClick={() => toggleItem(index)}
                className="w-full p-6 text-left"
              >
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold pr-4 transition-colors duration-200 ${
                    openItems.includes(index) 
                      ? 'text-primary' 
                      : 'text-gray-900 group-hover:text-primary'
                  }`}>
                    {item.question}
                  </h3>
                  <div className="flex-shrink-0">
                    <ChevronDown 
                      className={`h-5 w-5 transition-all duration-300 ease-in-out ${
                        openItems.includes(index) 
                          ? 'text-primary rotate-180' 
                          : 'text-gray-500 group-hover:text-primary'
                      }`} 
                    />
                  </div>
                </div>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openItems.includes(index) 
                    ? 'max-h-96 opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}
              >
                <CardContent className="px-6 pb-6 pt-0">
                  <p className="text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Still have questions? We're here to help!
          </p>
          <a 
            href="mailto:kamil@kamilvitek.cz"
            className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  );
}
