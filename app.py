from flask import Flask, render_template, redirect, url_for, request, session
import requests
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Set a secure random secret key

OSM_CLIENT_ID = "KhwZq8t6SJHnqx27EGhXLVQ32Q0x6prAs4Yfs8SkGhI"
OSM_CLIENT_SECRET = "IRnc-Rrn1X8C7lH9sm-9oRMQzi9OZcViXmrs59ypLZk"
OSM_REDIRECT_URI = "http://127.0.0.1:5030/callback"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    scope = "read_prefs"
    osm_auth_url = (
        f"https://www.openstreetmap.org/oauth2/authorize?client_id={OSM_CLIENT_ID}"
        f"&response_type=code&redirect_uri={OSM_REDIRECT_URI}&scope={scope}"
    )
    print("Generated OSM Auth URL:", osm_auth_url)  # For debugging
    return redirect(osm_auth_url)

@app.route('/callback')
def callback():
    code = request.args.get('code')
    if not code:
        return "Error: No code provided by OSM", 400

    print("Authorization code received:", code)  # Debugging

    token_url = "https://www.openstreetmap.org/oauth2/token"
    token_request_data = {
        "client_id": OSM_CLIENT_ID,
        "client_secret": OSM_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": OSM_REDIRECT_URI,
    }

    response = requests.post(
        token_url,
        data=token_request_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    if response.status_code != 200:
        print("Token exchange failed:", response.status_code, response.text)  # Debugging
        return f"Error fetching token: {response.text}", 400

    token_data = response.json()
    access_token = token_data.get("access_token")
    if not access_token:
        print("No access token received")  # Debugging
        return "Error: No access token received", 400

    user_info_url = "https://api.openstreetmap.org/api/0.6/user/details.json"
    user_response = requests.get(
        user_info_url,
        headers={"Authorization": f"Bearer {access_token}"}
    )

    if user_response.status_code != 200:
        print("User data request failed:", user_response.status_code, user_response.text)  # Debugging
        return f"Error fetching user info: {user_response.text}", 400

    user_data = user_response.json()
    session['osm_user'] = user_data
    print("User data saved to session:", user_data)  # Debugging

    print("Redirecting to /map")  # Debugging
    return redirect(url_for('map'))

@app.route('/map')
def map():
    if 'osm_user' not in session:
        print("No user in session, redirecting to login")  # Debugging
        return redirect(url_for('login'))
    print("Rendering map for user:", session['osm_user'])  # Debugging
    return render_template('map.html', user=session['osm_user'])

@app.route('/save_road', methods=['POST'])
def save_road():
    data = request.json
    # Здесь вы можете обработать данные и сохранить их
    print("Полученные данные:", data)
    return {"message": "Данные сохранены успешно"}, 200


@app.route('/logout')
def logout():
    session.pop('osm_user', None)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=5030)
