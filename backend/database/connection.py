import pymysql

def connection():
    return pymysql.connect (
        host='localhost',
        user='root',
        password='Pg260410',
        database='twitch-projeto',
        cursorclass=pymysql.cursor.Cursor
    )
