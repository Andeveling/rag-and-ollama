<<<<<<< HEAD
<file upload>
=======
# PRD: WhatsApp RAG Bot for Home Laboratory Appointments

## 1. Product overview

### 1.1 Document title and version

* PRD: WhatsApp RAG Bot for Home Laboratory Appointments
* Version: 1.0

### 1.2 Product summary

An intelligent WhatsApp chatbot powered by RAG (Retrieval Augmented Generation) technology that enables customers to schedule, modify, and cancel home laboratory appointments in Buga, Colombia. The bot provides automated appointment management, pricing information, and availability checking while maintaining a conversational interface.

The system integrates ChromaDB for intelligent information retrieval and PostgreSQL for appointment data management, offering customers a seamless experience for scheduling medical laboratory sample collection at their homes during early morning hours (5:00 AM - 6:30 AM).

## 2. Goals

### 2.1 Business goals

* Reduce manual coordination time for appointment scheduling by 80%
* Minimize scheduling errors and double bookings
* Increase appointment booking conversion rate through 24/7 availability
* Scale laboratory services efficiently without proportional staff increase
* Improve customer satisfaction through instant response times

### 2.2 User goals

* Schedule laboratory appointments quickly and conveniently via WhatsApp
* Get instant information about prices, availability, and service areas
* Easily modify or cancel existing appointments
* Receive clear confirmation and appointment details
* Access service information without phone calls or visits

### 2.3 Non-goals

* Provide medical diagnoses or interpret laboratory results
* Offer services outside Buga's urban perimeter
* Store or manage medical images permanently
* Replace human medical professionals for consultation
* Handle emergency medical situations

## 3. User personas

### 3.1 Key user types

* Primary customers needing laboratory services for themselves
* Family members scheduling appointments for relatives
* Patients with chronic conditions requiring regular monitoring
* First-time users unfamiliar with the service

### 3.2 Basic persona details

* **Regular patient**: Adults 25-65 who need periodic laboratory tests for health monitoring and prefer convenient home service
* **Caregiver**: Family members (often adult children) who manage healthcare appointments for elderly relatives or dependents
* **New customer**: First-time users seeking information about services, pricing, and availability before making their first appointment

### 3.3 Role-based access

* **Customer**: Can schedule, modify, and cancel their own appointments, view pricing, and check availability
* **System**: Automatically manages appointment slots, sends confirmations, and maintains data consistency

## 4. Functional requirements

* **Appointment scheduling** (Priority: High)
  * Accept appointment requests with sample type and location details
  * Verify availability within operating hours (5:00 AM - 6:30 AM)
  * Collect and validate customer contact information and address

* **Appointment management** (Priority: High)
  * Allow customers to cancel existing appointments
  * Enable rescheduling with new date/time selection
  * Provide appointment confirmation and reminder functionality

* **Information services** (Priority: Medium)
  * Provide pricing information ($20,000 flat rate)
  * Share available time slots for requested dates
  * Confirm service area coverage within Buga's urban perimeter

* **Medical order verification** (Priority: High)
  * Request medical order photo via WhatsApp
  * Confirm receipt of medical documentation
  * Ensure appointment completion requires valid medical order

## 5. User experience

### 5.1 Entry points & first-time user flow

* Customer initiates conversation through WhatsApp
* Bot provides welcome message and service overview
* New users receive information about pricing, hours, and coverage area
* Clear menu options guide users to their desired action

### 5.2 Core experience

* **Natural conversation**: Bot maintains conversational tone while efficiently gathering required information
  * This ensures users feel comfortable and understood throughout the interaction

* **Quick confirmation**: Appointment details are summarized and confirmed before finalizing
  * This reduces errors and gives customers confidence in their booking

* **Clear next steps**: After scheduling, customers receive specific instructions about medical order submission
  * This ensures smooth service delivery and reduces confusion

### 5.3 Advanced features & edge cases

* Handle multiple appointment requests in single conversation
* Manage appointment conflicts and suggest alternatives
* Process appointment modifications close to scheduled time
* Provide appropriate responses for requests outside service scope

### 5.4 UI/UX highlights

* Conversational interface using natural Spanish language
* Quick response buttons for common actions
* Clear appointment summaries with all relevant details
* Friendly, professional tone throughout interactions

## 6. Narrative

Customers discover the laboratory service through word-of-mouth or referrals and contact the WhatsApp bot to schedule their first appointment. The bot greets them warmly, explains the service, and guides them through a simple scheduling process. After providing their sample type, location, and preferred time, customers receive available options and select their appointment. They submit their medical order photo, receive confirmation, and can easily manage their appointment if changes are needed. The experience feels personal and efficient, encouraging customers to use the service regularly for their healthcare needs.

## 7. Success metrics

### 7.1 User-centric metrics

* Average response time under 2 seconds for standard queries
* Appointment completion rate above 95%
* Customer satisfaction score above 4.5/5
* Successful first-time booking rate above 80%

### 7.2 Business metrics

* Reduction in manual scheduling time by 80%
* Appointment booking conversion rate above 70%
* Daily appointment capacity utilization above 85%
* Customer retention rate for repeat bookings above 60%

### 7.3 Technical metrics

* Bot availability uptime above 99.5%
* Query response accuracy above 90%
* System response time under 3 seconds
* Error rate below 1% for appointment transactions

## 8. Technical considerations

### 8.1 Integration points

* WhatsApp Business API through Baileys library
* ChromaDB for RAG-powered information retrieval
* PostgreSQL for appointment and customer data storage
* Ollama for local LLM processing with Gemma model
* BuilderBot framework for conversation flow management

### 8.2 Data storage & privacy

* Customer data encrypted and stored securely in PostgreSQL
* Medical order photos not permanently stored (WhatsApp only)
* Personal information access limited to authorized systems
* GDPR-compliant data handling practices

### 8.3 Scalability & performance

* Docker containerization for easy deployment scaling
* ChromaDB vector database for efficient semantic search
* Local LLM processing to reduce external API dependencies
* Optimized database queries for appointment availability checks

### 8.4 Potential challenges

* WhatsApp API rate limiting during high traffic periods
* Natural language understanding accuracy for complex requests
* Integration complexity between multiple technology components
* Maintaining consistent bot personality across diverse conversations

## 9. Milestones & sequencing

### 9.1 Project estimate

* Medium: 8-12 weeks for full implementation

### 9.2 Team size & composition

* 2-3 developers: Backend developer, AI/ML specialist, WhatsApp integration specialist

### 9.3 Suggested phases

* **Phase 1**: Core bot framework and basic scheduling (4 weeks)
  * WhatsApp integration, basic conversation flows, appointment database setup

* **Phase 2**: RAG implementation and advanced features (3 weeks)
  * ChromaDB integration, intelligent query handling, appointment management features

* **Phase 3**: Testing, optimization, and deployment (2-3 weeks)
  * User acceptance testing, performance optimization, production deployment

## 10. User stories

### 10.1. Schedule new appointment

* **ID**: LAB-001
* **Description**: As a customer, I want to schedule a new laboratory appointment so that I can have samples collected at my home at a convenient time.
* **Acceptance criteria**:
  * Bot responds to appointment request within 2 seconds
  * System collects sample type, address, and preferred time
  * Bot presents available time slots within service hours (5:00 AM - 6:30 AM)
  * Customer can select from available options
  * System requests medical order photo before confirmation
  * Appointment is confirmed with unique reference number
  * Customer receives appointment summary with all details

### 10.2. Check service availability

* **ID**: LAB-002
* **Description**: As a potential customer, I want to check if the service is available in my area and view pricing information so that I can decide whether to book an appointment.
* **Acceptance criteria**:
  * Bot provides service area information (Buga urban perimeter)
  * System displays current pricing ($20,000)
  * Bot explains service hours (5:00 AM - 6:30 AM)
  * Available sample types are listed (blood, urine, fecal, saliva)
  * Information is provided in clear, non-technical language

### 10.3. Modify existing appointment

* **ID**: LAB-003
* **Description**: As a customer with an existing appointment, I want to reschedule or cancel my appointment so that I can adjust to changes in my schedule.
* **Acceptance criteria**:
  * Bot can locate existing appointments by phone number
  * Customer can choose to reschedule or cancel
  * For rescheduling, new available times are presented
  * Cancellation is confirmed with cancellation reference
  * Modified appointment details are summarized and confirmed
  * System updates appointment database accordingly

### 10.4. Submit medical order

* **ID**: LAB-004
* **Description**: As a customer who has scheduled an appointment, I want to submit my medical order photo so that my appointment can be confirmed and processed.
* **Acceptance criteria**:
  * Bot requests medical order photo after appointment selection
  * System accepts image files through WhatsApp
  * Bot confirms receipt of medical order photo
  * Photo is not stored permanently in system database
  * Appointment status updates to confirmed after photo submission
  * Customer receives final confirmation with appointment details

### 10.5. Handle service inquiries

* **ID**: LAB-005
* **Description**: As a customer, I want to ask questions about the service so that I can understand what's included and make informed decisions.
* **Acceptance criteria**:
  * Bot responds to pricing questions with current rates
  * Service coverage area is clearly explained
  * Operating hours and days are provided
  * Sample types and preparation instructions are available
  * Bot handles common questions without human intervention
  * Complex queries are escalated appropriately

### 10.6. User authentication and data management

* **ID**: LAB-006
* **Description**: As a system user, I want my interactions to be secure and my data to be protected so that my personal information remains private.
* **Acceptance criteria**:
  * Users are identified by WhatsApp phone number
  * Customer data is encrypted in database storage
  * Medical order photos are not permanently stored
  * Personal information is not shared with third parties
  * System maintains conversation history for appointment management
  * Data retention policies are enforced automatically
>>>>>>> 25a86dc (feat: Implement Ollama service for local LLM processing)
