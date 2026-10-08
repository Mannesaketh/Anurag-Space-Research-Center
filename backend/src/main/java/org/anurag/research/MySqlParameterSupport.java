package org.anurag.research;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DelegatingDataSource;

/**
 * MySQL Connector/J has no native java.util.UUID support (it would Java-serialize the object),
 * so UUID parameters are bound as their canonical 36-character string (columns are CHAR(36)).
 * java.time.Instant parameters are bound as java.sql.Timestamp.
 * Done centrally here so individual queries can keep passing UUID/Instant values.
 */
@Configuration
public class MySqlParameterSupport {

    @Bean
    static BeanPostProcessor mysqlParameterDataSourceWrapper() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof DataSource dataSource && !(bean instanceof ConvertingDataSource)) return new ConvertingDataSource(dataSource);
                return bean;
            }
        };
    }

    static final class ConvertingDataSource extends DelegatingDataSource {
        ConvertingDataSource(DataSource target) { super(target); }

        @Override
        public Connection getConnection() throws SQLException { return wrap(super.getConnection()); }

        @Override
        public Connection getConnection(String username, String password) throws SQLException { return wrap(super.getConnection(username, password)); }
    }

    static Object convert(Object value) {
        if (value instanceof UUID uuid) return uuid.toString();
        if (value instanceof Instant instant) return Timestamp.from(instant);
        return value;
    }

    static Connection wrap(Connection connection) {
        return (Connection) Proxy.newProxyInstance(MySqlParameterSupport.class.getClassLoader(), new Class<?>[] {Connection.class},
            handler(connection, (method, result) -> result instanceof PreparedStatement statement && method.getName().startsWith("prepare") ? wrap(statement) : result));
    }

    static PreparedStatement wrap(PreparedStatement statement) {
        Class<?>[] types = statement instanceof java.sql.CallableStatement ? new Class<?>[] {java.sql.CallableStatement.class} : new Class<?>[] {PreparedStatement.class};
        InvocationHandler converting = (proxy, method, args) -> {
            if (method.getName().equals("setObject") && args != null && args.length >= 2) {
                Object converted = convert(args[1]);
                if (converted != args[1]) {
                    if (converted instanceof String text) statement.setString((Integer) args[0], text);
                    else statement.setTimestamp((Integer) args[0], (Timestamp) converted);
                    return null;
                }
            }
            return invoke(statement, method, args);
        };
        return (PreparedStatement) Proxy.newProxyInstance(MySqlParameterSupport.class.getClassLoader(), types, converting);
    }

    interface ResultMapper { Object map(Method method, Object result) throws SQLException; }

    static InvocationHandler handler(Object target, ResultMapper mapper) {
        return (proxy, method, args) -> {
            if (method.getName().equals("unwrap") && args != null && args[0] instanceof Class<?> type && type.isInstance(target)) return target;
            if (method.getName().equals("isWrapperFor") && args != null && args[0] instanceof Class<?> type && type.isInstance(target)) return true;
            return mapper.map(method, invoke(target, method, args));
        };
    }

    static Object invoke(Object target, Method method, Object[] args) throws Throwable {
        try { return method.invoke(target, args); }
        catch (InvocationTargetException error) { throw error.getTargetException(); }
    }
}
