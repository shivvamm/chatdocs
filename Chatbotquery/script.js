/* THIS SNAKE CASE IS USED SO THAT CHAT BOT WILL NOT CONFLICT WITH OTHER SITES */
const AI_CHAT_BOT_GLOBAL_VARIABLES = {
  chatbotKey: null,
  minimized: false,
  isClientInfoSent: false,
  isClientProvidedEmail: false,
  clientInfo: {},
  CompanyBotName: null,
  staticMsg: null
}
/* THIS SNAKE CASE IS USED SO THAT CHAT BOT WILL NOT CONFLICT WITH OTHER SITES */


/* This is to keep our chat bot local storage keys unique so that these will not conflict with any site */
const LOCAL_STORAGE_KEY = Object.freeze({
  clientInfo: 'AI_CHAT_BOT__CLIENT_INFO',
  isClientInfoSent: 'AI_CHAT_BOT__CLIENT_INFO_SENT',
  clientEmail: 'AI_CHAT_BOT__CLIENT_EMAIL',
  isClientProvidedEmail: 'AI_CHAT_BOT__IS_CLIENT_PROVIDED_EMAIL',
  AI_ChatSessionId: 'AI_CHAT_BOT__SESSION_ID',
  AI_ChatHistory: 'AI_CHAT_BOT__CHAT_HISTORY',
  AI_ChatHistoryExpiry: 'AI_CHAT_BOT__CHAT_HISTORY_EXPIRY'
});

const PREV_LOCAL_STORAGE_KEY_MAP = Object.freeze({
  AI_CHAT_BOT__CLIENT_INFO:'clientInfo',
  AI_CHAT_BOT__CLIENT_INFO_SENT: 'detailsSent',
  AI_CHAT_BOT__CLIENT_EMAIL: 'email',
  AI_CHAT_BOT__IS_CLIENT_PROVIDED_EMAIL: 'isEmailProvided',
  AI_CHAT_BOT__SESSION_ID: 'sessionId',
  AI_CHAT_BOT__CHAT_HISTORY: 'tempChatHistory'
});
/* This is to keep our chat bot local storage keys unique so that these will not conflict with any site */

function initChatbot() {
  console.log('DOM fully loaded and parsed');
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://aibotfiles.vercel.app/style.css';
  
  AI_CHAT_BOT_GLOBAL_VARIABLES.isClientProvidedEmail = true;

  document.head.appendChild(link);

  let scriptContent = document.getElementById('ai-chatdocs-bot');
  const apiKeyFromScriptTagId = scriptContent.dataset.apiKey;
  AI_CHAT_BOT_GLOBAL_VARIABLES.chatbotKey = scriptContent.dataset.botId;
  const CompanyName = scriptContent.dataset.companyName || '"Company Name"';
  AI_CHAT_BOT_GLOBAL_VARIABLES.CompanyBotName = scriptContent.dataset.botName || '"Bot Name"';

  const container = document.createElement('div');
  container.className = 'chatbot-container';

  const botContainer = document.createElement('div');
  botContainer.className = 'chatbot-bot-container';
  botContainer.style.display = 'none';

  const botIntroPage = document.createElement('chatbotIntroPage');
  botIntroPage.className = 'chatbot-intro-page';
  botIntroPage.style.display = 'none';

  const header = document.createElement('chatbotHeader');
  const titleBar = document.createElement('div');
  titleBar.className = 'chatbot-title-bar';
  const logoImg = document.createElement('img');
  logoImg.classList.add('chatbotImg');
  logoImg.src = 'https://aibotfiles.vercel.app/bot.png';
  logoImg.className = 'chatbot-logo';
  const titleContainer = document.createElement('div');
  titleContainer.classList.add('chatbot-company-name');
  const companyName = document.createElement('chatbotH1');
  companyName.textContent = CompanyName;
  const chatWithContainer = document.createElement('chatbotH3');
  chatWithContainer.textContent = 'Chat with';
  titleBar.appendChild(logoImg);
  titleContainer.appendChild(chatWithContainer);
  titleContainer.appendChild(companyName);
  titleBar.appendChild(titleContainer);

  const actionDiv = document.createElement('div');
  actionDiv.className = 'chatbot-action';
  const upArrowBtn = document.createElement('chatbotButton');
  upArrowBtn.id = 'chatbot-up-arrow';
  upArrowBtn.title = 'Go to top';
  const upArrowImg = document.createElement('img');
  upArrowImg.classList.add('chatbotImg');
  upArrowImg.src = 'https://aibotfiles.vercel.app/uparrow.png';
  upArrowBtn.appendChild(upArrowImg);
  const minimizeBtn = document.createElement('chatbotButton');
  minimizeBtn.id = 'chatbot-minimize';
  minimizeBtn.title = 'Minimize';
  const minimizeImg = document.createElement('img');
  minimizeImg.classList.add('chatbotImg');
  minimizeImg.src = 'https://aibotfiles.vercel.app/minus.png';
  minimizeBtn.appendChild(minimizeImg);
  const clearBtn = document.createElement('chatbotButton');
  clearBtn.id = 'chatbot-clear';
  clearBtn.title = 'Clear chat';
  const clearImg = document.createElement('img');
  clearImg.classList.add('chatbotImg');
  clearImg.src = 'https://aibotfiles.vercel.app/delete.png';
  clearBtn.appendChild(clearImg);
  actionDiv.appendChild(minimizeBtn);
  actionDiv.appendChild(upArrowBtn);
  actionDiv.appendChild(clearBtn);

  const actionDropdownDiv = document.createElement('div');
  actionDropdownDiv.classList = 'chatbot-action-dropdown';
  const actionDropdownImg = document.createElement('img');
  actionDropdownImg.src = 'https://aibotfiles.vercel.app/expand-arrow.svg';
  actionDropdownDiv.appendChild(actionDropdownImg);
  header.appendChild(titleBar);
  header.appendChild(actionDiv);
  header.appendChild(actionDropdownDiv);
  botContainer.appendChild(header);

  const actionDropdownComponent = document.createElement(
    'actionDropdownComponent'
  );
  actionDropdownComponent.appendChild(minimizeBtn.cloneNode(true));
  actionDropdownComponent.appendChild(upArrowBtn.cloneNode(true));
  actionDropdownComponent.appendChild(clearBtn.cloneNode(true));
  actionDropdownDiv.appendChild(actionDropdownComponent);
  actionDropdownComponent.style.display = 'none';


  AI_CHAT_BOT_GLOBAL_VARIABLES.staticMsg = `Hi there! I'm ${AI_CHAT_BOT_GLOBAL_VARIABLES.CompanyBotName}, How can I assist you today ?`
  AI_CHAT_BOT_GLOBAL_VARIABLES.isClientProvidedEmail = true;

  const section = document.createElement('chatbotSection');
  const initialGreetings = document.createElement('div');
  initialGreetings.className = 'chatbot-initial-greetings';
  const greetingImg = document.createElement('img');
  greetingImg.classList.add('chatbotImg');
  greetingImg.src = 'https://aibotfiles.vercel.app/bot.png';
  const initialMessage = document.createElement('span');
  initialMessage.className = 'chatbot-initial-message';
  initialMessage.textContent = AI_CHAT_BOT_GLOBAL_VARIABLES.staticMsg;
  initialGreetings.appendChild(greetingImg);
  initialGreetings.appendChild(initialMessage);
  const staticQuestions = document.createElement('div');
  staticQuestions.className = 'chatbot-static-questions';
  section.appendChild(initialGreetings);
  section.appendChild(staticQuestions);
  botContainer.appendChild(section);

  const hr = document.createElement('hr');
  const footer = document.createElement('footer');
  const form = document.createElement('form');
  form.id = 'chatbot-query-form';
  form.autocomplete = 'off';
  const inputText = document.createElement('input');
  inputText.type = 'text';
  inputText.placeholder = 'Enter your message.....';
  inputText.id = 'chatbot-input-query';
  const apiKey = document.createElement('input');
  apiKey.type = 'hidden';
  apiKey.id = 'chatbot-api-key';
  apiKey.value = apiKeyFromScriptTagId;
  const sendBtn = document.createElement('button');
  sendBtn.classList.add('chatbot-send-button');
  sendBtn.title = 'Send message';
  const sendImg = document.createElement('img');
  sendImg.classList.add('chatbotImg');
  sendImg.src = 'https://aibotfiles.vercel.app/Vector.svg';
  sendBtn.appendChild(sendImg);
  sendBtn.type = 'submit';
  form.appendChild(inputText);
  form.appendChild(apiKey);
  form.appendChild(sendBtn);
  const poweredBy = document.createElement('div');
  poweredBy.innerHTML = '<span>&copy;</span> Powered by ChatDocs';
  footer.appendChild(form);
  footer.appendChild(hr.cloneNode());
  footer.appendChild(poweredBy);
  botContainer.appendChild(hr);
  botContainer.appendChild(footer);

  const botButton = document.createElement('chatbotButton');
  botButton.className = 'chatbot-bot-button';
  botButton.title = 'Jelly';
  
  botButton.innerHTML =  `
    <div class="chatbot-bot-highlight-text">How can I help you?</div>
    <div>
      <div class="animate-container">
        <div class="waves-block">
          <div class="waves wave-1"></div>
          <div class="waves wave-2"></div>
          <div class="waves wave-3"></div>
        </div>
      </div>
      <img src="https://aibotfiles.vercel.app/bot.png"></img>
    </div>
    `;

  container.appendChild(botIntroPage);
  container.appendChild(botContainer);
  container.appendChild(botButton);

  document.body.appendChild(container);
  initializeIntroPage(AI_CHAT_BOT_GLOBAL_VARIABLES.CompanyBotName);
  initializeBot();
}

// Support both DOMContentLoaded and late dynamic loading
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatbot);
} else {
  initChatbot();
}

function checkChatBotChatHistoryExpiry(){
  const date = new Date();
  const currentDate = date.toISOString().split('T')[0];
  const expiryDate = getItemFromChatBotStore(LOCAL_STORAGE_KEY.AI_ChatHistoryExpiry);
  if(currentDate > expiryDate){
    removeItemFromChatBotStore(LOCAL_STORAGE_KEY.AI_ChatHistory);
    setChatBotChatHistoryExpiry();
  }
}

function setChatBotChatHistoryExpiry(){
  const date = new Date();
  const formattedDate = date.toISOString().split('T')[0];
  setItemToChatBotStore(LOCAL_STORAGE_KEY.AI_ChatHistoryExpiry, formattedDate);
}

/*This function resolves previously added issue */ 
function checkLocalStorageExpiryIssue(value){
  try {
    const parsedValue = JSON.parse(value);
    if(typeof parsedValue == 'object' && parsedValue.value){
      return parsedValue.value;
    }
    return value
  } catch (err) {
    return value;
  }
}

/*This function check and clears if previously used localstorage keys exists */ 
function checkPrevStorageExists(key){
  try{
    const prevValue = localStorage.getItem(PREV_LOCAL_STORAGE_KEY_MAP[key]);
    if (!prevValue) {
      return null;
    }
    const value = checkLocalStorageExpiryIssue(prevValue)
    removeItemFromChatBotStore(PREV_LOCAL_STORAGE_KEY_MAP[key]);
    setItemToChatBotStore(key, value);
    if(key === LOCAL_STORAGE_KEY.clientEmail || key === LOCAL_STORAGE_KEY.AI_ChatSessionId){
      return value
    }
    return JSON.parse(value)
  } catch(err) {
    removeItemFromChatBotStore(key);
    removeItemFromChatBotStore(PREV_LOCAL_STORAGE_KEY_MAP[key]);
    return null;
  }
}

function setItemToChatBotStore(key, value){
  try{
    if(key === LOCAL_STORAGE_KEY.AI_ChatHistory && !getItemFromChatBotStore(key)){
      setChatBotChatHistoryExpiry()
    }
    if(typeof value === 'object'){
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, value);
    }
  } catch(err) {
    console.error(err)
  }
}

function getItemFromChatBotStore(key){
  try{
    const value = localStorage.getItem(key);
    if (!value) {
      return checkPrevStorageExists(key);
    }
    if(key === LOCAL_STORAGE_KEY.clientEmail || key === LOCAL_STORAGE_KEY.AI_ChatSessionId){
      return value
    }
    return JSON.parse(value);
  } catch(err) {
    removeItemFromChatBotStore(key);
    return null;
  }
}

function removeItemFromChatBotStore(key){
  localStorage.removeItem(key);
  if(PREV_LOCAL_STORAGE_KEY_MAP[key]){
    localStorage.removeItem(PREV_LOCAL_STORAGE_KEY_MAP[key]);
  }
}

function initializeIntroPage(CompanyBotName) {
  const botIntroPage = document.querySelector('.chatbot-intro-page');
  const botContainer = document.querySelector('.chatbot-bot-container');
  const botButton = document.querySelector('.chatbot-bot-button');
  const queryInput = document.querySelector('#chatbot-input-query');

  const botIntroMinimize = document.createElement('botIntroMinimize');
  const botIntroMinimizeImg = document.createElement('img');
  botIntroMinimizeImg.classList = 'chatbotImg';
  botIntroMinimizeImg.src = 'https://aibotfiles.vercel.app/cancel.png';
  botIntroMinimizeImg.addEventListener('click', () => {
    botIntroPage.style.display = 'none';
    botButton.style.display = 'flex';
    document.querySelector('html').classList.remove('no-scroll');
  });
  botIntroMinimize.appendChild(botIntroMinimizeImg);
  botIntroPage.appendChild(botIntroMinimize);

  const botMascotImg = document.createElement('img');
  botMascotImg.classList = 'chatbot-mascot-image';
  botMascotImg.src = 'https://aibotfiles.vercel.app/bot-mascot.png';
  botIntroPage.appendChild(botMascotImg);

  const botIntroH1 = document.createElement('chatbotIntroH1');
  botIntroH1.textContent = 'Hello!';
  botIntroPage.appendChild(botIntroH1);

  const botIntroH3 = document.createElement('chatbotIntroH3');
  botIntroH3.textContent = `My name is ${CompanyBotName} and I'm here to help you`;
  botIntroPage.appendChild(botIntroH3);

  const botIntroButton = document.createElement('chatbotIntroButton');
  botIntroButton.textContent = 'Ask Jelly';
  botIntroPage.appendChild(botIntroButton);

  botIntroButton.addEventListener('click', () => {
    botIntroPage.style.display = 'none';
    botContainer.style.display = 'flex';
    queryInput.focus();
  });
}

function initializeBot() {
  console.log('Initializing bot');

  const botContainer = document.querySelector('.chatbot-bot-container');
  const botButton = document.querySelector('.chatbot-bot-button');
  const initialMessage = document.querySelector('.chatbot-initial-message');
  const queryInput = document.querySelector('#chatbot-input-query');
  const apiKeyInput = document.querySelector('#chatbot-api-key');
  const staticQuestionsContainer = document.querySelector(
    '.chatbot-static-questions'
  );
  const responseSection = document.querySelector('chatbotSection');
  const AI_ChatSessionId = getItemFromChatBotStore(LOCAL_STORAGE_KEY.AI_ChatSessionId) || generateUUID();
  AI_CHAT_BOT_GLOBAL_VARIABLES.isClientInfoSent = getItemFromChatBotStore(LOCAL_STORAGE_KEY.isClientInfoSent);
  AI_CHAT_BOT_GLOBAL_VARIABLES.clientInfo = getItemFromChatBotStore(LOCAL_STORAGE_KEY.clientInfo);
  AI_CHAT_BOT_GLOBAL_VARIABLES.isClientProvidedEmail = true;
  let response = [];
  const staticQuestions = [];
  const staticAnswers = [];
  const botAvatar = document.createElement('img');
  botAvatar.classList.add('chatbotImg');
  botAvatar.setAttribute('src', 'https://aibotfiles.vercel.app/bot.png');
  const userAvatar = document.createElement('img');
  userAvatar.classList.add('chatbotImg');
  userAvatar.setAttribute('src', 'https://aibotfiles.vercel.app/user.png');
  function generateUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  }
  (function () {
    const AI_ChatHistory = getItemFromChatBotStore(LOCAL_STORAGE_KEY.AI_ChatHistory);
    if (!AI_ChatHistory?.length) {
      // const id = 'data';
      // const message = 'Welcome! To personalize our conversation, could you share your email address with me?';
      // initialGreeting = [ { id, message } ]
      // createResponseElements(message, id)
    } else {
      AI_ChatHistory.forEach(({ id, message, emailError }) => {
        createResponseElements(message, id === 'user' ? 'query' : emailError ? 'bot' : 'data');
      });
      response = AI_ChatHistory;
      AI_CHAT_BOT_GLOBAL_VARIABLES.minimized = true;
      // if(!AI_CHAT_BOT_GLOBAL_VARIABLES.isClientProvidedEmail && history.length >= 6){
      //   createResponseElements('Please provide a valid email', 'data');
      // }
    }
  })();
  if (!queryInput) {
    console.error('Query input not found');
    return;
  }
  if (!apiKeyInput) {
    console.error('API key input not found');
    return;
  }

  const chatbotActionDropdown = document.querySelector(
    '.chatbot-action-dropdown'
  );
  chatbotActionDropdown.addEventListener('click', () => {
    const changeActionVisibility = document.querySelector(
      'actionDropdownComponent'
    );
    if (changeActionVisibility.style.display === 'none') {
      changeActionVisibility.style.display = 'flex';
      chatbotActionDropdown.firstChild.style.rotate = '180deg';
    } else {
      changeActionVisibility.style.display = 'none';
      chatbotActionDropdown.firstChild.style.rotate = '0deg';
    }
  });

  document.addEventListener('click', (e) => {
    if (!document.querySelector('.chatbot-container').contains(e.target)) {
      document.querySelector('#chatbot-minimize').click();
      document.querySelector('.chatbot-intro-page').style.display = 'none';
    }
  });

  document.querySelectorAll('#chatbot-up-arrow').forEach((upArrow) => {
    upArrow.addEventListener('click', () => {
      initialMessage.scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.querySelectorAll('#chatbot-minimize').forEach((minimizeBtn) => {
    minimizeBtn.addEventListener('click', () => {
      AI_CHAT_BOT_GLOBAL_VARIABLES.minimized = true;
      botContainer.style.display = 'none';
      botButton.removeAttribute('style');
      document.querySelector('html').classList.remove('no-scroll');
    });
  });
  // window.addEventListener('DOMContentLoaded', () => {
  //   if (getItemFromChatBotStore(LOCAL_STORAGE_KEY.isClientProvidedEmail)) {
     
  //     botContainer.style.display = 'block'; 
  //     botButton.style.display = 'none'
      
  //   } else {
     
  //     botContainer.style.display = 'none'; 
  //     document.querySelector('html').classList.remove('no-scroll');
  //   }
  // });

  // document.addEventListener('visibilitychange', () => {
  //   if (document.hidden) {
  //     AI_CHAT_BOT_GLOBAL_VARIABLES.minimized = true;
  //     botContainer.style.display = 'none';
  //     botButton.removeAttribute('style');
  //     document.querySelector('html').classList.remove('no-scroll');
  //   }
  // });

  document.querySelectorAll('#chatbot-clear').forEach((clearBtn) => {
    clearBtn.addEventListener('click', () => {
      AI_CHAT_BOT_GLOBAL_VARIABLES.minimized = true;
      sendEmail(response);
      clearAllMessages();
      document.querySelector('html').classList.remove('no-scroll');
      clearChatHistory()
    });
  });

  botButton.addEventListener('click', () => {
    botButton.querySelector('.animate-container').style.display = 'none';
    botButton.querySelector('.chatbot-bot-highlight-text').style.display = 'none';
    botButton.style.display = 'none';
    if (AI_CHAT_BOT_GLOBAL_VARIABLES.minimized) {
      botContainer.style.display = 'flex';
      queryInput.focus();
      responseSection.scrollTo({
        top: responseSection.scrollHeight,
        behavior: 'smooth',
      });
    } else document.querySelector('.chatbot-intro-page').style.display = 'flex';
    document.querySelector('html').classList.add('no-scroll');
  });

  document
    .querySelector('#chatbot-query-form')
    .addEventListener('submit', sendQuery);

  showStaticQuestions();
  let scriptContent = document.getElementById('ai-chatdocs-bot');
  if (
    !scriptContent.dataset.apiKey ||
    !scriptContent.dataset.botId ||
    !scriptContent.dataset.companyName ||
    !scriptContent.dataset.botName
  ) {
    createResponseElements(
      'Either api key, bot id, company name or bot name attributes are missing, please check your script tag',
      'error'
    );
    return;
  }

  function clearAllMessages() {
    while (staticQuestionsContainer.nextSibling) {
      responseSection.removeChild(staticQuestionsContainer.nextSibling);
    }
    AI_CHAT_BOT_GLOBAL_VARIABLES.staticMsg = `Hi there! I'm ${AI_CHAT_BOT_GLOBAL_VARIABLES.CompanyBotName}, How can I assist you today ?`
    const initialMessage = document.querySelector('span.chatbot-initial-message');
    initialMessage.textContent = AI_CHAT_BOT_GLOBAL_VARIABLES.staticMsg;
    response = [];
    queryInput.focus();
  }

  function markdownToHtml(markdown) {
    // Convert headers
    markdown = markdown.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    markdown = markdown.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    markdown = markdown.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Convert bold and italic text
    markdown = markdown.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); // Bold
    markdown = markdown.replace(/\*(.+?)\*/g, '<em>$1</em>'); // Italic

    // Convert links
    markdown = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Convert unordered lists
    markdown = markdown.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
    markdown = markdown.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');

    // Convert paragraphs
    markdown = markdown.replace(/^\s*(?!<h|<ul|<li|<a|<strong|<em)(.+)$/gm, '<p>$1</p>');

    return markdown;
  }

  function textTypingEffect(element, text) {
    element.innerHTML = markdownToHtml(text);
    responseSection.scrollTop = responseSection.scrollHeight;
    queryInput.removeAttribute('disabled');
    queryInput.focus();
    responseSection.scrollTop = responseSection.scrollHeight;
    return;
  }

  function showStaticQuestions() {
    staticQuestions.map((question, index) => {
      const button = document.createElement('chatbotButton');
      button.classList.add('chatbot-static-question');
      button.textContent = question;
      button.addEventListener('click', () => showStaticAnswers(index));
      staticQuestionsContainer.appendChild(button);
    });
  }

  function showStaticAnswers(index) {
    createResponseElements(staticQuestions[index], 'query');
    createResponseElements(staticAnswers[index], 'data');
  }

  function createResponseElements(text, type, link) {
    const div = document.createElement('div');
    const span = document.createElement('span');

    if (type === 'query') {
      div.classList.add('chatbot-user-message-container');
      span.classList.add('chatbot-user-message');
      span.innerHTML = text;
      div.appendChild(span);
      div.appendChild(userAvatar.cloneNode());
      responseSection.appendChild(div);
      responseSection.scrollTop = responseSection.scrollHeight;
    } else if (type === 'data') {
      div.classList.add('chatbot-response-message-container');
      span.classList.add('chatbot-response-message');
      div.appendChild(botAvatar.cloneNode());
      div.appendChild(span);
      responseSection.appendChild(div);
      textTypingEffect(span, text);
      if (link) {
        const a = document.createElement('a');
        a.setAttribute('target', '_blank');
        a.setAttribute('href', link);
        a.textContent = 'For more info click here';
        a.classList.add('chatbot-response-link');
        a.style.display = 'none';
        responseSection.appendChild(a);
      }
    } else {
      div.classList.add('chatbot-response-message-container');
      span.classList.add('chatbot-error-message');
      div.appendChild(botAvatar.cloneNode());
      div.appendChild(span);
      responseSection.appendChild(div);
      textTypingEffect(span, text);
    }
  }
  function saveEmailMsg(message, id, emailError){
    createResponseElements(message, id);
    response.push({ id, message, emailError});
    saveChatHistory();
  }
  async function checkEmailStatus(query){
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const email = query?.match?.(emailRegex)?.[0];
    if(!email){
      saveEmailMsg('Please provide a valid email', 'bot', true);
      return;
    }
    

    const hunterApiKey = window.CHATDOCS_HUNTER_API_KEY || '';
    const res = await fetch(`https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${hunterApiKey}`, {
      method: 'GET',
    });
    if (res.status !== 200) {
      saveEmailMsg('Please try again', 'data', true);
      return;
    }

    let data = await res.json();
    if (data === '') {
      saveEmailMsg('Please try again', 'data', true);
      return;
    }
    if(data.data.status === "invalid"){
      saveEmailMsg('Please provide a valid email', 'bot', true);
      return;
    }
    if(data.data.webmail){
      saveEmailMsg('Please provide your valid organization email', 'bot', true);
      return;
    }
    await updateDetails(email)
    saveEmailMsg(`Thanks for sharing your email! I'm ${AI_CHAT_BOT_GLOBAL_VARIABLES.CompanyBotName}. How can I assist you today?`, 'data');
  }
  async function sendQuery(e) {
    e.preventDefault();
    if (!queryInput.value.trim()) return;
    queryInput.setAttribute('disabled', true);
    const query = queryInput.value;
    queryInput.value = '';
    if (response && !response.length) {
      response.unshift({
        id: 'data',
        message: AI_CHAT_BOT_GLOBAL_VARIABLES.staticMsg
      })
    }
    createResponseElements(query, 'query');
    response.push({ id: 'user', message: query });
    // Email check removed — go straight to query
    loadingResponseAnimation();
    const apiKey = apiKeyInput.value;
    const bearerToken = 'Bearer ' + apiKey.trim();
    const res = await fetch('http://localhost:8000/query', {
      method: 'POST',
      body: JSON.stringify({
        query,
        session_id: AI_ChatSessionId,
        context: response,
        chatbot_id: AI_CHAT_BOT_GLOBAL_VARIABLES.chatbotKey,
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
      },
    });
    if (res.status !== 200) {
      createResponseElements(
        'Something went wrong, please try again!',
        'error'
      );
      stopLoadingResponseAnimation();
      return;
    }
    stopLoadingResponseAnimation();

    let data = await res.json();
    if (data === '') {
      createResponseElements(
        'Something went wrong, please try again!',
        'error'
      );
      return;
    }
    response.push({ id: 'bot', message: data });
    saveChatHistory();
    createResponseElements(data, 'data');
    setItemToChatBotStore(LOCAL_STORAGE_KEY.AI_ChatSessionId, AI_ChatSessionId);
    if(!AI_CHAT_BOT_GLOBAL_VARIABLES.isClientInfoSent){
      sendDetails();
      AI_CHAT_BOT_GLOBAL_VARIABLES.isClientInfoSent = true;
      
      setItemToChatBotStore(LOCAL_STORAGE_KEY.isClientInfoSent, 'true');
      setItemToChatBotStore(LOCAL_STORAGE_KEY.clientInfo, JSON.stringify(AI_CHAT_BOT_GLOBAL_VARIABLES.clientInfo));
    }
    // if(response.length && !AI_CHAT_BOT_GLOBAL_VARIABLES.isClientProvidedEmail){
    //   createResponseElements('Please provide your email to proceed further', 'data');
    // }
  }

  const gatherClientInfo = async () => {
    // Client's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Language preference
    const language = navigator.language || navigator.userLanguage;

    // Device type detection (basic)
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    // User agent and platform
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // Referrer
    const referrer = document.referrer;

    // Approximate geolocation (only if the user consents)
    let location = null;
    if (navigator.geolocation) {
      location = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          }),
          (err) => resolve(null) // In case of error or if permission is denied
        );
      });
    }

    // Network connection type (may not be available on all devices)
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const networkType = connection ? connection.effectiveType : "unknown";

    return {
      timezone,
      language,
      isMobile,
      userAgent,
      platform,
      referrer,
      location,
      networkType
    };
  };

  async function sendDetailsApi(){
    console.log("Sending Details")
    const apiKey = apiKeyInput.value;
    const bearerToken = 'Bearer ' + apiKey.trim();
    const res = await fetch('http://localhost:8000/add-visitor', {
      method: 'POST',
      body: JSON.stringify({
        chatbot_id: AI_CHAT_BOT_GLOBAL_VARIABLES.chatbotKey,
        session_id: AI_ChatSessionId,
        origin_url:window.location.href,
        ...AI_CHAT_BOT_GLOBAL_VARIABLES.clientInfo
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearerToken,
      },
    });
    if (res.status !== 200) {
      AI_CHAT_BOT_GLOBAL_VARIABLES.isClientInfoSent = false;
      return;
    }

    let data = await res.json();
    if (data === '') {
      AI_CHAT_BOT_GLOBAL_VARIABLES.isClientInfoSent = false;
      AI_CHAT_BOT_GLOBAL_VARIABLES.isClientProvidedEmail = false
      return;
    }
    AI_CHAT_BOT_GLOBAL_VARIABLES.isClientInfoSent = true;
    console.log("Details sent successfully")
    return true;
  }

  async function sendDetails(email){
    AI_CHAT_BOT_GLOBAL_VARIABLES.clientInfo = await gatherClientInfo();
    if(email){
      AI_CHAT_BOT_GLOBAL_VARIABLES.clientInfo.email = email;
    }
    return sendDetailsApi()
  }

  async function updateDetails(email){
    const isClientInfoSent = await sendDetails(email);
    console.log("Details Updated successfully", isClientInfoSent)
    if(isClientInfoSent){
      AI_CHAT_BOT_GLOBAL_VARIABLES.isClientProvidedEmail = true;
      
      setItemToChatBotStore(LOCAL_STORAGE_KEY.isClientProvidedEmail,'true')
      
      setItemToChatBotStore(LOCAL_STORAGE_KEY.clientEmail, email)
    }
  }
  

  async function sendEmail(chatHistory) {
    if (!chatHistory || !chatHistory.length) return;
    const apiKey = apiKeyInput.value;
    const bearerToken = 'Bearer ' + apiKey.trim();

    try {
      const response = await fetch('http://localhost:8000/send-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: bearerToken,
        },
        body: JSON.stringify({
          chatHistory,
          chatbot_id: AI_CHAT_BOT_GLOBAL_VARIABLES.chatbotKey,
          session_id: AI_ChatSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  function loadingResponseAnimation() {
    const div = document.createElement('div');
    const span = document.createElement('span');
    div.appendChild(botAvatar.cloneNode());
    div.appendChild(span.cloneNode());
    div.appendChild(span.cloneNode());
    div.appendChild(span.cloneNode());

    div.classList.add('chatbot-typing');
    responseSection.appendChild(div);
    responseSection.scrollTop = responseSection.scrollHeight;
  }

  function stopLoadingResponseAnimation() {
    responseSection.removeChild(responseSection.lastChild);
  }

  function saveChatHistory() {
    if (!response) return;
    setItemToChatBotStore(LOCAL_STORAGE_KEY.AI_ChatHistory,JSON.stringify(response))
  }
  function clearChatHistory() {
    removeItemFromChatBotStore(LOCAL_STORAGE_KEY.AI_ChatHistory);
    console.log("chat history cleared and testing key");
  }
}
