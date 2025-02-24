import time
import json
import os
import pickle
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# Setup Chrome options to avoid detection
chrome_options = Options()
chrome_options.add_argument('--disable-blink-features=AutomationControlled')
chrome_options.add_argument('--headless')  # Run in headless mode to avoid detection
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')

# Initialize the WebDriver
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

# Use environment variables for username, email, and password
USERNAME = os.getenv('X_USERNAME')
EMAIL = os.getenv('X_EMAIL')
PASSWORD = os.getenv('X_PASSWORD')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

SEARCH_KEYWORDS = ['Floods']  # Add more keywords if needed

# Log in to X.com with handling for additional confirmation (username/email step)
def login_to_x():
    driver.get('https://x.com/login')
    time.sleep(5)  # Let the page load

    # Step 1: Enter email/username
    username_input = driver.find_element(By.NAME, "text")
    username_input.send_keys(EMAIL)
    username_input.send_keys(Keys.RETURN)
    time.sleep(5)

    # Step 2: Check if additional confirmation is required (enter username again)
    try:
        additional_info_input = driver.find_element(By.CSS_SELECTOR, "[data-testid='ocfEnterTextTextInput']")
        if additional_info_input:
            additional_info_input.send_keys(USERNAME)
            additional_info_input.send_keys(Keys.RETURN)
            time.sleep(5)
    except Exception as e:
        print(f"No additional info required or error occurred: {e}")

    # Step 3: Enter password
    password_input = driver.find_element(By.NAME, "password")
    password_input.send_keys(PASSWORD)
    password_input.send_keys(Keys.RETURN)
    time.sleep(5)

def load_cookies():
    if os.path.exists('cookies.pkl'):
        driver.get('https://x.com/login')
        cookies = pickle.load(open('cookies.pkl', 'rb'))
        for cookie in cookies:
            driver.add_cookie(cookie)
        driver.refresh()

def save_cookies():
    pickle.dump(driver.get_cookies(), open('cookies.pkl', 'wb'))

def clean_text(text):
    return text.encode('raw-unicode-escape').decode('utf-8')

def search_and_scrape():
    posts = []
    for keyword in SEARCH_KEYWORDS:
        search_url = f"https://x.com/search?q=%23{keyword}&src=typeahead_click&f=live"
        driver.get(search_url)
        time.sleep(5)  # Let search results load

        # Scroll down the page a few times to load more posts
        for _ in range(3):
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(3)

        # Scroll up the page
        for _ in range(3):
            driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(3)

        # Scrape posts
        tweet_elements = driver.find_elements(By.CSS_SELECTOR, "article")
        for tweet in tweet_elements:
            try:
                # Scrape tweet details
                tweet_date = tweet.find_element(By.TAG_NAME, 'time').get_attribute('datetime')
                tweet_text = tweet.find_element(By.CSS_SELECTOR, "[data-testid='tweetText']").text
                tweet_text = clean_text(tweet_text)

                # Scrape poster's name
                poster_name = tweet.find_element(By.CSS_SELECTOR, "span.css-1jxf684").text

                # Scrape images (if any)
                tweet_images = tweet.find_elements(By.CSS_SELECTOR, "img[src^='https://pbs.twimg.com/media/']")
                image_urls = [img.get_attribute("src") for img in tweet_images]

                posts.append({
                    'poster': poster_name,
                    'date': tweet_date,
                    'text': tweet_text,
                    'images': image_urls
                })
            except Exception as e:
                print(f"Error extracting tweet data: {e}")
                continue

    return posts

def load_previous_data(file_name="previous_data.json"):
    if os.path.exists(file_name):
        with open(file_name, 'r', encoding='utf-8') as file:
            return json.load(file)
    return {}

def save_new_data(data, file_name="previous_data.json"):
    with open(file_name, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

def send_to_gemini(data):
    # Load your Google Gemini API key
    genai.configure(api_key=GEMINI_API_KEY)

    # Create the model
    generation_config = {
        "temperature": 1,
        "top_p": 0.95,
        "top_k": 64,
        "max_output_tokens": 8192,
        "response_mime_type": "application/json",
    }

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=generation_config,
    )

    chat_session = model.start_chat(
  history=[
    {
      "role": "user",
      "parts": [
        "[\n    {\n        \"poster\": \"Maa Gulf\",\n        \"date\": \"2024-09-10T10:15:00.000Z\",\n        \"text\": \"\\\\u0c35\\\\u0c30\\\\u0c26 \\\\u0c2a\\\\u0c4d\\\\u0c30\\\\u0c2d\\\\u0c3e\\\\u0c35\\\\u0c3f\\\\u0c24 \\\\u0c2a\\\\u0c4d\\\\u0c30\\\\u0c3e\\\\u0c02\\\\u0c24\\\\u0c3e\\\\u0c32\\\\u0c4d\\\\u0c32\\\\u0c4b \\\\u0c2d\\\\u0c3e\\\\u0c30\\\\u0c24 \\\\u0c38\\\\u0c48\\\\u0c28\\\\u0c4d\\\\u0c2f\\\\u0c02 \\\\u0c38\\\\u0c39\\\\u0c3e\\\\u0c2f\\\\u0c15 \\\\u0c1a\\\\u0c30\\\\u0c4d\\\\u0c2f\\\\u0c32\\\\u0c41\\n\\nhttps://maagulf.com/view/93372/latestnews/ap-indian-army-relief-operation-in-flood-affected-areas\\\\u2026\\n\\n#IndianArmy #AndhraPradesh #Floods #VijayawadaFloods #ReliefOperations #MaaGulf #MaaGulfNews\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"vishal mittal\",\n        \"date\": \"2024-09-10T10:10:05.000Z\",\n        \"text\": \"Testing Vishal #Floods\",\n        \"images\": [\n            \"https://pbs.twimg.com/media/GXG3FpBXAAAjkZO?format=jpg&name=small\"\n        ]\n    },\n    {\n        \"poster\": \"Bastar Talkies\",\n        \"date\": \"2024-09-10T10:10:00.000Z\",\n        \"text\": \"\\\"\\\\u0938\\\\u0941\\\\u0915\\\\u092e\\\\u093e \\\\u0915\\\\u0947 \\\\u0915\\\\u094b\\\\u0902\\\\u091f\\\\u093e \\\\u092e\\\\u0947\\\\u0902 \\\\u092c\\\\u093e\\\\u0922\\\\u093c \\\\u0915\\\\u0947 \\\\u0939\\\\u093e\\\\u0932\\\\u093e\\\\u0924: \\\\u0921\\\\u094d\\\\u0930\\\\u094b\\\\u0928 \\\\u0938\\\\u0947 \\\\u0926\\\\u0947\\\\u0916\\\\u093f\\\\u090f \\\\u0938\\\\u0902\\\\u0915\\\\u091f \\\\u0915\\\\u0940 \\\\u0924\\\\u0938\\\\u094d\\\\u0935\\\\u0940\\\\u0930\\\\u0947\\\\u0902 \\\\u0914\\\\u0930  \\\\u092a\\\\u094d\\\\u0930\\\\u092d\\\\u093e\\\\u0935\\\\u093f\\\\u0924 \\\\u0915\\\\u094d\\\\u0937\\\\u0947\\\\u0924\\\\u094d\\\\u0930 \\\\u0915\\\\u0940 \\\\u0938\\\\u094d\\\\u0925\\\\u093f\\\\u0924\\\\u093f\\\"\\n#bastartalkies #bastartalkiesnews #floods #Floods2024 #sukma2024\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"NTV Telugu\",\n        \"date\": \"2024-09-10T10:07:58.000Z\",\n        \"text\": \"\\\\u0c2e\\\\u0c33\\\\u0c4d\\\\u0c32\\\\u0c40 \\\\u0c17\\\\u0c4b\\\\u0c26\\\\u0c3e\\\\u0c35\\\\u0c30\\\\u0c3f \\\\u0c09\\\\u0c17\\\\u0c4d\\\\u0c30\\\\u0c30\\\\u0c42\\\\u0c2a\\\\u0c02\\n\\n#Telangana #Bhadrachalam #Godavari #Floods #NTVNews #NTVTelugu\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Surya Reddy\",\n        \"date\": \"2024-09-10T09:57:41.000Z\",\n        \"text\": \"A Youngster washed away with his bike, while crossing an overflowing bridge on a stream in #Alluri Sitarama Raju district, #AndhraPradesh. He tried much to save his bike, but washed away.\\n\\nHe was lucky, knows swimming and was rescued by the locals.\\n\\n#AndhraPradeshFloods #Floods\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Mahaa News\",\n        \"date\": \"2024-09-10T09:56:01.000Z\",\n        \"text\": \"\\\\u0c2a\\\\u0c4d\\\\u0c30\\\\u0c15\\\\u0c3e\\\\u0c36\\\\u0c02 \\\\u0c2c\\\\u0c4d\\\\u0c2f\\\\u0c3e\\\\u0c30\\\\u0c47\\\\u0c1c\\\\u0c4d \\\\u0c2a\\\\u0c48 \\\\u0c15\\\\u0c41\\\\u0c1f\\\\u0c4d\\\\u0c30..! | Vijawada Boat Accedent | MahaaNews \\n#VijayawadaFloods #ApFloods #Floods #PrakasamBarrage #VijayawadaRains #NandhigamSuresh #YSRCP #DevieneniAvinash #MahaaNews\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"People Newz\",\n        \"date\": \"2024-09-10T09:47:35.000Z\",\n        \"text\": \"\\\\u0c17\\\\u0c24 \\\\u0c2a\\\\u0c4d\\\\u0c30\\\\u0c2d\\\\u0c41\\\\u0c24\\\\u0c4d\\\\u0c35\\\\u0c02 \\\\u0c1a\\\\u0c47\\\\u0c38\\\\u0c3f\\\\u0c28 \\\\u0c24\\\\u0c2a\\\\u0c4d\\\\u0c2a\\\\u0c41\\\\u0c28\\\\u0c3f \\\\u0c2e\\\\u0c4b\\\\u0c38\\\\u0c3e\\\\u0c32\\\\u0c28\\\\u0c3f \\\\u0c2e\\\\u0c47\\\\u0c2e\\\\u0c41 \\\\u0c15\\\\u0c35\\\\u0c30\\\\u0c4d \\\\u0c1a\\\\u0c47\\\\u0c2f\\\\u0c3e\\\\u0c32\\\\u0c3f | #janasenapartypawankalyanspeech #peoplenewz #ytshorts #viralvideos #trendingshorts #deputycm #ap #latestnews #apnews #peoplenewz #newnews #trending #floods #vijayawada #politicianshelp #helo #fooddistribution  | \\n@peoplenewzapp\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Irene\",\n        \"date\": \"2024-09-10T08:58:58.000Z\",\n        \"text\": \"Terrible #floods due to heavy downpour, Thai Nguyen, #Vietnam, September 09, 2024\\n\\nAccording to the European Severe Weather Events Database, in #Europe:\\n 2000-2004 - 661 cases of abnormal precipitation\\n 2019-2023 - 29 031, 44 times more\\n\\nWhy there are more floods, learn\",\n        \"images\": [\n            \"https://pbs.twimg.com/media/GXGlKPQX0AAeEQL?format=png&name=small\"\n        ]\n    },\n    {\n        \"poster\": \"Weather & Radar India\",\n        \"date\": \"2024-09-10T08:56:28.000Z\",\n        \"text\": \" \\\\u092e\\\\u094c\\\\u0938\\\\u092e \\\\u0914\\\\u0930 \\\\u0930\\\\u093e\\\\u0921\\\\u093e\\\\u0930 \\\\u092f\\\\u0942\\\\u091c\\\\u0930 \\\\u0930\\\\u093e\\\\u092e\\\\u093e\\\\u0935\\\\u0924\\\\u093e\\\\u0930 \\\\u092e\\\\u0940\\\\u0923\\\\u093e: '\\\\u0939\\\\u092e\\\\u093e\\\\u0930\\\\u0947 \\\\u0917\\\\u093e\\\\u0902\\\\u0935  \\\\u0926\\\\u0924\\\\u0935\\\\u093e\\\\u0938, \\\\u0924\\\\u0939\\\\u0938\\\\u0940\\\\u0932- \\\\u0928\\\\u093f\\\\u0935\\\\u093e\\\\u0908 ,\\\\u091c\\\\u093f\\\\u0932\\\\u093e -\\\\u091f\\\\u094b\\\\u0902\\\\u0915, \\\\u0930\\\\u093e\\\\u091c\\\\u094d\\\\u092f -\\\\u0930\\\\u093e\\\\u091c\\\\u0938\\\\u094d\\\\u0925\\\\u093e\\\\u0928, \\\\u092d\\\\u093e\\\\u0930\\\\u0940 \\\\u092c\\\\u093e\\\\u0930\\\\u093f\\\\u0936 \\\\u0915\\\\u0939\\\\u0940\\\\u0902 \\\\u0926\\\\u093f\\\\u0928\\\\u094b\\\\u0902 \\\\u0938\\\\u0947 \\\\u091c\\\\u093e\\\\u0930\\\\u0940 \\\\u0939\\\\u0948 ! \\\\u0907\\\\u0938\\\\u0915\\\\u0947 \\\\u0915\\\\u093e\\\\u0930\\\\u0923 \\\\u0915\\\\u094b\\\\u0920\\\\u0940 (\\\\u0915\\\\u0941\\\\u0906)\\\\u092e\\\\u0947\\\\u0902 , \\\\u0915\\\\u093e \\\\u0938\\\\u094d\\\\u0924\\\\u0930 \\\\u0907\\\\u0924\\\\u0928\\\\u093e \\\\u092c\\\\u0922\\\\u093c \\\\u0917\\\\u092f\\\\u093e \\\\u0939\\\\u0948 \\\\u0915\\\\u093f \\\\u0913\\\\u0935\\\\u0930\\\\u092b\\\\u094d\\\\u0932\\\\u094b \\\\u0939\\\\u094b \\\\u0930\\\\u0939\\\\u0947 \\\\u0939\\\\u0948\\\\u0902 \\\\u092c\\\\u093e\\\\u0901\\\\u0927 \\\\u092d\\\\u0940 \\\\u0913\\\\u0935\\\\u0930 \\\\u092b\\\\u094d\\\\u0932\\\\u094b \\\\u0939\\\\u094b \\\\u0930\\\\u0939\\\\u0947 \\\\u0939\\\\u0948\\\\u0902!'   #rajasthan #monsoon2024 #rain #floods\",\n        \"images\": [\n            \"https://pbs.twimg.com/media/GXGmKrhXsAIDuuY?format=jpg&name=small\",\n            \"https://pbs.twimg.com/media/GXGmKrjWUAAG5je?format=jpg&name=360x360\",\n            \"https://pbs.twimg.com/media/GXGmKrfXAAAWkrv?format=jpg&name=360x360\"\n        ]\n    },\n    {\n        \"poster\": \"Bastar Talkies\",\n        \"date\": \"2024-09-10T08:50:41.000Z\",\n        \"text\": \"\\\"\\\\u0938\\\\u0941\\\\u0915\\\\u092e\\\\u093e \\\\u092e\\\\u0947\\\\u0902 \\\\u092c\\\\u093e\\\\u0922\\\\u093c \\\\u092e\\\\u0947\\\\u0902 \\\\u092b\\\\u0902\\\\u0938\\\\u0947 \\\\u0932\\\\u094b\\\\u0917\\\\u094b\\\\u0902 \\\\u0915\\\\u093e \\\\u0938\\\\u094d\\\\u0925\\\\u093e\\\\u0928\\\\u0940\\\\u092f \\\\u0932\\\\u094b\\\\u0917 \\\\u0914\\\\u0930 \\\\u0938\\\\u0941\\\\u0930\\\\u0915\\\\u094d\\\\u0937\\\\u093e \\\\u092c\\\\u0932\\\\u094b\\\\u0902 \\\\u0926\\\\u094d\\\\u0935\\\\u093e\\\\u0930\\\\u093e \\\\u0928\\\\u093e\\\\u0935 \\\\u0938\\\\u0947 \\\\u0938\\\\u0941\\\\u0930\\\\u0915\\\\u094d\\\\u0937\\\\u093f\\\\u0924 \\\\u0930\\\\u0947\\\\u0938\\\\u094d\\\\u0915\\\\u094d\\\\u092f\\\\u0942\\\"\\n\\n#bastartalkies #bastartalkiesnews #floods #ChhattisgarhNews #sukma2024\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Herzschlag der Erde, Schumann Frequenz\",\n        \"date\": \"2024-09-10T10:03:03.000Z\",\n        \"text\": \"Hello dear  Tajomaru  https://x.com/ibisredibis0\\nthanks for the follow! \\nhttp://herzschlag-der-erde.de\\n\\n\\nplease support my project:\\nhttps://paypal.me/HerzschlagDerErde\\\\u2026\\n\\n\\n#SchumannResonance #EarthFrequency #Geophysics #SolarStorm \",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Herzschlag der Erde, Schumann Frequenz\",\n        \"date\": \"2024-09-10T10:03:02.000Z\",\n        \"text\": \"Hello dear  David Williams  https://x.com/david88987\\nthanks for the follow! \\nhttp://herzschlag-der-erde.de\\n\\n\\nplease support my project:\\nhttps://paypal.me/HerzschlagDerErde\\\\u2026\\n\\n\\n#SchumannResonance #EarthFrequency #Geophysics #SolarStorm \",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Herzschlag der Erde, Schumann Frequenz\",\n        \"date\": \"2024-09-10T10:03:02.000Z\",\n        \"text\": \"Hello dear  Nelson Rebecca  https://x.com/nelsonrebe38946\\nthanks for the follow! \\nhttp://herzschlag-der-erde.de\\n\\n\\nplease support my project:\\nhttps://paypal.me/HerzschlagDerErde\\\\u2026\\n\\n\\n#SchumannResonance #EarthFrequency #Geophysics #SolarStorm \",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Herzschlag der Erde, Schumann Frequenz\",\n        \"date\": \"2024-09-10T10:00:37.000Z\",\n        \"text\": \"ENERGYUPDATE\\n September 10, 2024 at 12:00PM\\nMore information and live data on my website \\nhttp://herzschlag-der-erde.de \\n\\n\\n#SchumannResonance #SchumannFrequency \\n#SolarFlare #CME #SpaceWeather #Geophysics #SolarStorm #Earthquakes #Volcanoes  #Consciousness #Spirituality #G\\\\u2026\",\n        \"images\": [\n            \"https://pbs.twimg.com/media/GXG07leXIAASKpB?format=jpg&name=small\"\n        ]\n    },\n    {\n        \"poster\": \"Herzschlag der Erde, Schumann Frequenz\",\n        \"date\": \"2024-09-10T09:52:52.000Z\",\n        \"text\": \"Hello dear  Tifany Goularte  https://x.com/goulartifa\\nthanks for the follow! \\nhttp://herzschlag-der-erde.de\\n\\n\\nplease support my project:\\nhttps://paypal.me/HerzschlagDerErde\\\\u2026\\n\\n\\n#SchumannResonance #EarthFrequency #Geophysics #SolarStorm \",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Global News Report\",\n        \"date\": \"2024-09-10T09:48:35.000Z\",\n        \"text\": \"288 #Earthquakes recorded at Mt. Kanlaon; public advised to be ready http://dlvr.it/TD3CjL\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Policy Center for the New South\",\n        \"date\": \"2024-09-10T09:40:38.000Z\",\n        \"text\": \" In our #interview w/ Ms. \\n@lauralbornoz\\n , Director of Chile's National #Oil Company, we explore #Chile's strategy in managing natural disasters like #earthquakes. From adapting construction practices to '#human reconstruction,' she emphasizes the need for a multidimensional\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Herzschlag der Erde, Schumann Frequenz\",\n        \"date\": \"2024-09-10T09:00:17.000Z\",\n        \"text\": \"ENERGYUPDATE\\n September 10, 2024 at 11:00AM\\nMore information and live data on my website \\nhttp://herzschlag-der-erde.de \\n\\n\\n#SchumannResonance #SchumannFrequency \\n#SolarFlare #CME #SpaceWeather #Geophysics #SolarStorm #Earthquakes #Volcanoes  #Consciousness #Spirituality #G\\\\u2026\",\n        \"images\": [\n            \"https://pbs.twimg.com/media/GXGnH-uXUAAXPnu?format=jpg&name=small\"\n        ]\n    },\n    {\n        \"poster\": \"D Sisco\",\n        \"date\": \"2024-09-10T08:41:15.000Z\",\n        \"text\": \"#Earthquakes Swarm of quakes rattles Northern California https://sfchronicle.com/bayarea/article/earthquake-shakes-sf-bay-area-19598940.php?utm_campaign=CMS%20Sharing%20Tools%20(Premium)&utm_source=t.co&utm_medium=referral\\\\u2026 via \\n@sfchronicle\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Sauood Yaqoob (سعود یعقوب)\",\n        \"date\": \"2024-09-10T08:27:30.000Z\",\n        \"text\": \"A light-intensity earthquake hit South Kashmir\\n#Earthquakes\\n#JammuAndKashmir\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Mr. ISHFAQ\",\n        \"date\": \"2024-09-10T08:24:57.000Z\",\n        \"text\": \"#Earthquakes\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Herzschlag der Erde, Schumann Frequenz\",\n        \"date\": \"2024-09-10T08:00:29.000Z\",\n        \"text\": \"ENERGYUPDATE\\n September 10, 2024 at 10:00AM\\nMore information and live data on my website \\nhttp://herzschlag-der-erde.de \\n\\n\\n#SchumannResonance #SchumannFrequency \\n#SolarFlare #CME #SpaceWeather #Geophysics #SolarStorm #Earthquakes #Volcanoes  #Consciousness #Spirituality #G\\\\u2026\",\n        \"images\": [\n            \"https://pbs.twimg.com/media/GXGZb5dXMAAeEt5?format=jpg&name=small\"\n        ]\n    },\n    {\n        \"poster\": \"Earthquake Monitor\",\n        \"date\": \"2024-09-10T07:17:02.000Z\",\n        \"text\": \"List and maps of largest #earthquakes in the past 24 hours - updated continuously\\n#1: M5.5 central East Pacific Rise - 13 hrs ago : https://volcanodiscovery.com/earthquakes/quake-info/9596440/ma\\\\u2026...:\",\n        \"images\": []\n    },\n    {\n        \"poster\": \"Herzschlag der Erde, Schumann Frequenz\",\n        \"date\": \"2024-09-10T07:12:16.000Z\",\n        \"text\": \"Hello dear  WAFAA   https://x.com/meawwmeu\\nthanks for the follow! \\nhttp://herzschlag-der-erde.de\\n\\n\\nplease support my project:\\nhttps://paypal.me/HerzschlagDerErde\\\\u2026\\n\\n\\n#SchumannResonance #EarthFrequency #Geophysics #SolarStorm \",\n        \"images\": []\n    }\n]\n\nuse this data to tell me poster's name exact datetime what exactly is the problem in breif and location as a seperate key of the problem if possible, make sure to include all the objects and translate all the unicodes to actual data and if text is in another language then translate it to english as well. and make sure that there is no weired characters like \\n etc in  final result",
      ],
    },
    {
      "role": "model",
      "parts": [
        "```json\n[\n{\"poster\": \"Maa Gulf\", \"date\": \"2024-09-10T10:15:00.000Z\", \"text\": \"War relief work is being carried out by the Indian Army in flood-affected areas. \\n\\nhttps://maagulf.com/view/93372/latestnews/ap-indian-army-relief-operation-in-flood-affected-areas…\\n\\n#IndianArmy #AndhraPradesh #Floods #VijayawadaFloods #ReliefOperations #MaaGulf #MaaGulfNews\", \"images\": [], \"problem\": \"Floods\", \"location\": \"Andhra Pradesh, India\"}, {\"poster\": \"vishal mittal\", \"date\": \"2024-09-10T10:10:05.000Z\", \"text\": \"Testing Vishal #Floods\", \"images\": [\"https://pbs.twimg.com/media/GXG3FpBXAAAjkZO?format=jpg&name=small\"], \"problem\": \"Floods\", \"location\": \"Not specified\"}, {\"poster\": \"Bastar Talkies\", \"date\": \"2024-09-10T10:10:00.000Z\", \"text\": \"\\\"Sukma: To help people in need, a donation camp was organized for the flood-affected people. People have come together for donations and assistance, giving a message of unity in this time of crisis. \", \"images\": [], \"problem\": \"Floods\", \"location\": \"Sukma, India\"}, {\"poster\": \"NTV Telugu\", \"date\": \"2024-09-10T10:07:58.000Z\", \"text\": \"Heavy Godavari River floods\", \"images\": [], \"problem\": \"Floods\", \"location\": \"Bhadrachalam, Telangana, India\"}, {\"poster\": \"Surya Reddy\", \"date\": \"2024-09-10T09:57:41.000Z\", \"text\": \"A Youngster washed away with his bike, while crossing an overflowing bridge on a stream in #Alluri Sitarama Raju district, #AndhraPradesh. He tried much to save his bike, but washed away.\\n\\nHe was lucky, knows swimming and was rescued by the locals.\\n\\n#AndhraPradeshFloods #Floods\", \"images\": [], \"problem\": \"Floods\", \"location\": \"Alluri Sitarama Raju district, Andhra Pradesh, India\"}, {\"poster\": \"Mahaa News\", \"date\": \"2024-09-10T09:56:01.000Z\", \"text\": \"Prakasam Barrage Boat Accident in Vijayawada\", \"images\": [], \"problem\": \"Boat Accident\", \"location\": \"Vijayawada, Andhra Pradesh, India\"}, {\"poster\": \"People Newz\", \"date\": \"2024-09-10T09:47:35.000Z\", \"text\": \"Heavy rains and floods in Vijayawada. Deputy CM and politicians are distributing food and providing help to people affected by the floods.\", \"images\": [], \"problem\": \"Floods\", \"location\": \"Vijayawada, Andhra Pradesh, India\"}, {\"poster\": \"Irene\", \"date\": \"2024-09-10T08:58:58.000Z\", \"text\": \"Terrible #floods due to heavy downpour, Thai Nguyen, #Vietnam, September 09, 2024\\n\\nAccording to the European Severe Weather Events Database, in #Europe:\\n 2000-2004 - 661 cases of abnormal precipitation\\n 2019-2023 - 29 031, 44 times more\\n\\nWhy there are more floods, learn\", \"images\": [\"https://pbs.twimg.com/media/GXGlKPQX0AAeEQL?format=png&name=small\"], \"problem\": \"Floods\", \"location\": \"Thai Nguyen, Vietnam\"}, {\"poster\": \"Weather & Radar India\", \"date\": \"2024-09-10T08:56:28.000Z\", \"text\": \"Heavy rain and thunderstorms are expected in Rajasthan. Be prepared for floods, landslides, and strong winds. Take precautions and stay safe! #rajasthan #monsoon2024 #rain #floods\", \"images\": [\"https://pbs.twimg.com/media/GXGmKrhXsAIDuuY?format=jpg&name=small\", \"https://pbs.twimg.com/media/GXGmKrjWUAAG5je?format=jpg&name=360x360\", \"https://pbs.twimg.com/media/GXGmKrfXAAAWkrv?format=jpg&name=360x360\"], \"problem\": \"Heavy rainfall, Floods, Landslides, Strong Winds\", \"location\": \"Rajasthan, India\"}, {\"poster\": \"Bastar Talkies\", \"date\": \"2024-09-10T08:50:41.000Z\", \"text\": \"\\\"Sukma: There is a flood situation in Sukma. People are donating and assisting the flood-affected people.  \", \"images\": [], \"problem\": \"Floods\", \"location\": \"Sukma, India\"}, {\"poster\": \"Herzschlag der Erde, Schumann Frequenz\", \"date\": \"2024-09-10T10:03:03.000Z\", \"text\": \"Hello dear Tajomaru thanks for the follow! \\nhttp://herzschlag-der-erde.de\\n\\n\\nplease support my project:\\nhttps://paypal.me/HerzschlagDerErde…\\n\\n\\n#SchumannResonance #EarthFrequency #Geophysics #SolarStorm \", \"images\": [], \"problem\": \"Solar Storm\", \"location\": \"Not specified\"}, {\"poster\": \"Herzschlag der Erde, Schumann Frequenz\", \"date\": \"2024-09-10T10:03:02.000Z\", \"text\": \"Hello dear David Williams thanks for the follow! \\nhttp://herzschlag-der-erde.de\\n\\n\\nplease support my project:\\nhttps://paypal.me/HerzschlagDerErde…\\n\\n\\n#SchumannResonance #EarthFrequency #Geophysics #SolarStorm \", \"images\": [], \"problem\": \"Solar Storm\", \"location\": \"Not specified\"}, {\"poster\": \"Herzschlag der Erde, Schumann Frequenz\", \"date\": \"2024-09-10T10:03:02.000Z\", \"text\": \"Hello dear Nelson Rebecca thanks for the follow! \\nhttp://herzschlag-der-erde.de\\n\\n\\nplease support my project:\\nhttps://paypal.me/HerzschlagDerErde…\\n\\n\\n#SchumannResonance #EarthFrequency #Geophysics #SolarStorm \", \"images\": [], \"problem\": \"Solar Storm\", \"location\": \"Not specified\"}, {\"poster\": \"Herzschlag der Erde, Schumann Frequenz\", \"date\": \"2024-09-10T10:00:37.000Z\", \"text\": \"ENERGYUPDATE\\n September 10, 2024 at 12:00PM\\nMore information and live data on my website \\nhttp://herzschlag-der-erde.de \\n\\n\\n#SchumannResonance #SchumannFrequency \\n#SolarFlare #CME #SpaceWeather #Geophysics #SolarStorm #Earthquakes #Volcanoes  #Consciousness #Spirituality #G…\", \"images\": [\"https://pbs.twimg.com/media/GXG07leXIAASKpB?format=jpg&name=small\"], \"problem\": \"Solar Storm\", \"location\": \"Not specified\"}, {\"poster\": \"Herzschlag der Erde, Schumann Frequenz\", \"date\": \"2024-09-10T09:52:52.000Z\", \"text\": \"Hello dear Tifany Goularte thanks for the follow! \\nhttp://herzschlag-der-erde.de\\n\\n\\nplease support my project:\\nhttps://paypal.me/HerzschlagDerErde…\\n\\n\\n#SchumannResonance #EarthFrequency #Geophysics #SolarStorm \", \"images\": [], \"problem\": \"Solar Storm\", \"location\": \"Not specified\"}, {\"poster\": \"Global News Report\", \"date\": \"2024-09-10T09:48:35.000Z\", \"text\": \"288 #Earthquakes recorded at Mt. Kanlaon; public advised to be ready http://dlvr.it/TD3CjL\", \"images\": [], \"problem\": \"Earthquakes\", \"location\": \"Mount Kanlaon\"}, {\"poster\": \"Policy Center for the New South\", \"date\": \"2024-09-10T09:40:38.000Z\", \"text\": \"In our #interview with Ms. \\n@lauralbornoz\\n, Director of Chile's National #Oil Company, we explore #Chile's strategy in managing natural disasters like #earthquakes. From adapting construction practices to '#human reconstruction,' she emphasizes the need for a multidimensional\", \"images\": [], \"problem\": \"Earthquakes\", \"location\": \"Chile\"}, {\"poster\": \"Herzschlag der Erde, Schumann Frequenz\", \"date\": \"2024-09-10T09:00:17.000Z\", \"text\": \"ENERGYUPDATE\\n September 10, 2024 at 11:00AM\\nMore information and live data on my website \\nhttp://herzschlag-der-erde.de \\n\\n\\n#SchumannResonance #SchumannFrequency \\n#SolarFlare #CME #SpaceWeather #Geophysics #SolarStorm #Earthquakes #Volcanoes  #Consciousness #Spirituality #G…\", \"images\": [\"https://pbs.twimg.com/media/GXGnH-uXUAAXPnu?format=jpg&name=small\"], \"problem\": \"Solar Storm\", \"location\": \"Not specified\"}, {\"poster\": \"D Sisco\", \"date\": \"2024-09-10T08:41:15.000Z\", \"text\": \"#Earthquakes Swarm of quakes rattles Northern California https://sfchronicle.com/bayarea/article/earthquake-shakes-sf-bay-area-19598940.php?utm_campaign=CMS%20Sharing%20Tools%20(Premium)&utm_source=t.co&utm_medium=referral… via \\n@sfchronicle\", \"images\": [], \"problem\": \"Earthquakes\", \"location\": \"Northern California\"}, {\"poster\": \"Sauood Yaqoob (سعود یعقوب)\", \"date\": \"2024-09-10T08:27:30.000Z\", \"text\": \"A light-intensity earthquake hit South Kashmir\\n#Earthquakes\\n#JammuAndKashmir\", \"images\": [], \"problem\": \"Earthquakes\", \"location\": \"South Kashmir, Jammu and Kashmir, India\"}, {\"poster\": \"Mr. ISHFAQ\", \"date\": \"2024-09-10T08:24:57.000Z\", \"text\": \"#Earthquakes\", \"images\": [], \"problem\": \"Earthquakes\", \"location\": \"Not specified\"}, {\"poster\": \"Herzschlag der Erde, Schumann Frequenz\", \"date\": \"2024-09-10T08:00:29.000Z\", \"text\": \"ENERGYUPDATE\\n September 10, 2024 at 10:00AM\\nMore information and live data on my website \\nhttp://herzschlag-der-erde.de \\n\\n\\n#SchumannResonance #SchumannFrequency \\n#SolarFlare #CME #SpaceWeather #Geophysics #SolarStorm #Earthquakes #Volcanoes  #Consciousness #Spirituality #G…\", \"images\": [\"https://pbs.twimg.com/media/GXGZb5dXMAAeEt5?format=jpg&name=small\"], \"problem\": \"Solar Storm\", \"location\": \"Not specified\"}, {\"poster\": \"Earthquake Monitor\", \"date\": \"2024-09-10T07:17:02.000Z\", \"text\": \"List and maps of largest #earthquakes in the past 24 hours - updated continuously\\n#1: M5.5 central East Pacific Rise - 13 hrs ago : https://volcanodiscovery.com/earthquakes/quake-info/9596440/ma…...\", \"images\": [], \"problem\": \"Earthquakes\", \"location\": \"Central East Pacific Rise\"}, {\"poster\": \"Herzschlag der Erde, Schumann Frequenz\", \"date\": \"2024-09-10T07:12:16.000Z\", \"text\": \"Hello dear WAFAA thanks for the follow! \\nhttp://herzschlag-der-erde.de\\n\\n\\nplease support my project:\\nhttps://paypal.me/HerzschlagDerErde…\\n\\n\\n#SchumannResonance #EarthFrequency #Geophysics #SolarStorm \", \"images\": [], \"problem\": \"Solar Storm\", \"location\": \"Not specified\"}\n]\n\n\n```",
      ],
    },
  ])

    # Prepare the prompt to be sent to Gemini
    prompt = json.dumps({
        "instruction": "Use this data to tell me poster's name, exact datetime, what exactly is the problem in brief, and location as a separate key if possible. Translate all Unicode characters to actual data. If text is in another language, translate it to English, and ensure there are no weird characters like '\\n' in the final result.",
        "data": data
    })

    response = chat_session.send_message(prompt)
    response_text = response.text

    # Step 1: Remove escape characters like \n and extra backslashes
    # Replace escaped newlines with spaces and fix any formatting issues
    cleaned_response = response_text.replace("\\n", " ").replace('\\"', '"')

    # Step 2: Load the cleaned string as a JSON object
    try:
        json_data = json.loads(cleaned_response)
        # json_data = cleaned_response

        # Step 3: Save the clean data to a JSON file
        with open("Gemini_Posts.json", 'w', encoding='utf-8') as file:
            json.dump(json_data, file, indent=4, ensure_ascii=False)

        print("Data successfully written to Gemini_Posts.json")
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")

if __name__ == "__main__":
    try:
        # Step 1: Load cookies
        load_cookies()
        if not driver.get_cookie('auth_token'):  # Example check for authentication cookie
            login_to_x()
            save_cookies()

        # Step 2: Scrape the data
        scraped_data = search_and_scrape()

        # Step 3: Load previous data
        previous_data = load_previous_data()

        # Step 4: Check for new data
        if scraped_data != previous_data:
            # Save the new data
            save_new_data(scraped_data)

            # Step 5: Send the data to Gemini for further processing
            send_to_gemini(scraped_data)
        else:
            print("No new data")

    finally:
        driver.quit()
